let chartInstance = null;

document.getElementById('queryForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    const query = document.getElementById('query').value;
    const loadingElement = document.getElementById('loading');
    const responseElement = document.getElementById('response');

    // Show loading animation
    loadingElement.style.display = 'block';
    responseElement.style.display = 'none';

    const response = await fetch('/query', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            query: query
        })
    });

    // Hide loading animation
    loadingElement.style.display = 'none';

    if (response.ok) {
        const data = await response.json();

        // Parsing the output
        const answer = data.answer.split('>')[1].trim();
        const coordinates = data.coordinates;
        const cells = data.cells;
        const aggregator = data.aggregator;
        const summary = JSON.parse(data.summary); // Parse the summary JSON string

        // Extract the summary text from the parsed summary
        let summaryText = "";
        if (summary.Candidates && summary.Candidates.length > 0) {
            summaryText = summary.Candidates[0].Content.Parts.join(" ");
        }

        // Clean the summary text by removing symbols like '*'
        summaryText = summaryText.replace(/\*/g, "");

        document.getElementById('answer').textContent = answer;
        document.getElementById('coordinates').textContent = JSON.stringify(coordinates);
        document.getElementById('cells').textContent = cells.join(', ');
        document.getElementById('aggregator').textContent = aggregator;
        document.getElementById('summary').textContent = summaryText;

        responseElement.style.display = 'block';

        // Create a bar chart
        const ctx = document.getElementById('energyChart').getContext('2d');
        const energyData = cells.map(Number);
        const labels = coordinates.map(coord => `[${coord[0]},${coord[1]}]`);

        // Destroy the previous chart instance if it exists
        if (chartInstance) {
            chartInstance.destroy();
        }

        chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Energy Consumption (kWh)',
                    data: energyData,
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    } else {
        const errorText = await response.text();
        alert(`Error: ${errorText}`);
    }
});
