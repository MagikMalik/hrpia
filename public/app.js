async function loadMatches() {
  const dateInput = document.getElementById('matchDate');
  const date = dateInput.value || new Date().toISOString().substring(0, 10);
  const res = await fetch(`/api/matches?date=${date}`);
  const matches = await res.json();
  const tableBody = document.querySelector('#matchTable tbody');
  tableBody.innerHTML = '';
  for (const match of matches) {
    const tr = document.createElement('tr');
    const teams = `${match.home_team} vs ${match.away_team}`;
    const odds = match.bookmakers && match.bookmakers[0] ? JSON.stringify(match.bookmakers[0].markets) : '';
    tr.innerHTML = `<td>${teams}</td><td>${odds}</td><td id="pred-${match.id}"></td><td><button onclick="analyze('${match.id}', '${match.home_team}', '${match.away_team}', '${date}')">Analyze with AI</button></td>`;
    tableBody.appendChild(tr);
  }
  loadPredictions(date);
}

async function loadPredictions(date) {
  const res = await fetch(`/api/predictions?date=${date}`);
  const predictions = await res.json();
  for (const [matchId, data] of Object.entries(predictions)) {
    const cell = document.getElementById(`pred-${matchId}`);
    if (cell) cell.innerText = data.analysis;
  }
}

async function analyze(matchId, homeTeam, awayTeam, date) {
  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ matchId, homeTeam, awayTeam, date })
  });
  const data = await res.json();
  document.getElementById(`pred-${matchId}`).innerText = data.result;
}
