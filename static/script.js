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

        document.getElementById('answer').textContent = data.answer;
        document.getElementById('coordinates').textContent = JSON.stringify(data.coordinates);
        document.getElementById('cells').textContent = data.cells.join(', ');
        document.getElementById('aggregator').textContent = data.aggregator;

        document.getElementById('response').style.display = 'block';
    } else {
        const errorText = await response.text();
        alert(`Error: ${errorText}`);
    }
});
