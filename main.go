package main

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"strings"

	"github.com/google/generative-ai-go/genai"
	"github.com/joho/godotenv"
	"google.golang.org/api/option"
)

type AIModelConnector struct {
	Client *http.Client
}

type Inputs struct {
	Table map[string][]string `json:"table"`
	Query string              `json:"query"`
}

type Response struct {
	Answer      string   `json:"answer"`
	Coordinates [][]int  `json:"coordinates"`
	Cells       []string `json:"cells"`
	Aggregator  string   `json:"aggregator"`
}

func CsvToSlice(data string) (map[string][]string, error) {
	r := csv.NewReader(strings.NewReader(data))
	records, err := r.ReadAll()
	if err != nil {
		return nil, err
	}

	result := make(map[string][]string)
	headers := records[0]

	for _, header := range headers {
		result[header] = []string{}
	}

	for _, record := range records[1:] {
		for i, value := range record {
			result[headers[i]] = append(result[headers[i]], value)
		}
	}

	return result, nil
}

func (c *AIModelConnector) ConnectAIModel(payload interface{}, token string) (Response, error) {
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return Response{}, err
	}

	req, err := http.NewRequest("POST", "https://api-inference.huggingface.co/models/google/tapas-base-finetuned-wtq", strings.NewReader(string(jsonPayload)))
	if err != nil {
		return Response{}, err
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.Client.Do(req)
	if err != nil {
		return Response{}, err
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return Response{}, err
	}

	var response Response
	err = json.Unmarshal(body, &response)
	if err != nil {
		return Response{}, err
	}

	return response, nil
}

func GenerateSummary(query string, table map[string][]string, apiKey string) (string, error) {
	ctx := context.Background()
	client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return "", err
	}

	// Convert the table map to a string format suitable for the prompt
	tableStr := ""
	for key, values := range table {
		tableStr += fmt.Sprintf("%s: %s\n", key, strings.Join(values, ", "))
	}

	// Create the prompt with the table data and the query
	prompt := fmt.Sprintf("Given the following data:\n\n%s\n\n%s", tableStr, query)

	model := client.GenerativeModel("gemini-1.5-flash")
	resp, err := model.GenerateContent(
		ctx,
		genai.Text(prompt),
	)
	if err != nil {
		return "", err
	}

	marshalResponse, _ := json.Marshal(resp)
	return string(marshalResponse), nil
}

func handleQuery(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	err := godotenv.Load()
	if err != nil {
		http.Error(w, "Error loading .env file", http.StatusInternalServerError)
		return
	}

	huggingfaceToken := os.Getenv("HUGGINGFACE_TOKEN")
	if huggingfaceToken == "" {
		http.Error(w, "HUGGINGFACE_TOKEN not set in .env file", http.StatusInternalServerError)
		return
	}

	geminiToken := os.Getenv("GOOGLE_API_KEY")
	if geminiToken == "" {
		http.Error(w, "GOOGLE_API_KEY not set in .env file", http.StatusInternalServerError)
		return
	}

	data, err := ioutil.ReadFile("data-series.csv")
	if err != nil {
		http.Error(w, "Error reading CSV file", http.StatusInternalServerError)
		return
	}

	table, err := CsvToSlice(string(data))
	if err != nil {
		http.Error(w, "Error parsing CSV data", http.StatusInternalServerError)
		return
	}

	query := r.FormValue("query")
	if query == "" {
		http.Error(w, "Query not provided", http.StatusBadRequest)
		return
	}

	payload := Inputs{
		Table: table,
		Query: query,
	}

	connector := AIModelConnector{Client: &http.Client{}}
	response, err := connector.ConnectAIModel(payload, huggingfaceToken)
	if err != nil {
		http.Error(w, "Error connecting to AI model", http.StatusInternalServerError)
		return
	}

	// Generate summary using Gemini
	summary, err := GenerateSummary(query, table, geminiToken)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error generating summary: %v", err), http.StatusInternalServerError)
		return
	}

	responseWithSummary := struct {
		Response
		Summary string `json:"summary"`
	}{
		Response: response,
		Summary:  summary,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(responseWithSummary)
}

func main() {
	http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("static"))))
	http.HandleFunc("/query", handleQuery)

	fmt.Println("Server started at :8080")
	http.ListenAndServe(":8080", nil)
}
