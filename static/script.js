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

        const answer = data.answer.split('>')[1].trim();
        const coordinates = JSON.stringify(data.coordinates);
        const cells = data.cells.join(', ');
        const aggregator = data.aggregator;

        document.getElementById('answer').textContent = answer;
        document.getElementById('coordinates').textContent = coordinates;
        document.getElementById('cells').textContent = cells;
        document.getElementById('aggregator').textContent = aggregator;

        document.getElementById('response').style.display = 'block';
    } else {
        const errorText = await response.text();
        alert(`Error: ${errorText}`);
    }
});
