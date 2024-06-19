let chartInstance = null;

document.getElementById('queryForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    const query = document.getElementById('query').value;

    const response = await fetch('/query', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            query: query
        })
    });

    if (response.ok) {
        const data = await response.json();

        // Parsing the output
        const answer = data.answer.split('>')[1].trim();
        const coordinates = data.coordinates;
        const cells = data.cells;
        const aggregator = data.aggregator;

        document.getElementById('answer').textContent = answer;
        document.getElementById('coordinates').textContent = JSON.stringify(coordinates);
        document.getElementById('cells').textContent = cells.join(', ');
        document.getElementById('aggregator').textContent = aggregator;

        document.getElementById('response').style.display = 'block';

        // Create a bar chart
        const ctx = document.getElementById('energyChart').getContext('2d');
        const energyData = cells.map(Number);
        const labels = coordinates.map(coord => `[${coord[0]},${coord[1]}]`);

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
