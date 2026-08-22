(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const statusEl = document.getElementById('status');
  const messageEl = document.getElementById('message');
  const youEl = document.getElementById('you');
  const aiEl = document.getElementById('ai');
  const newBtn = document.getElementById('new');

  const COLS = 7, ROWS = 6;
  const W = canvas.width, H = canvas.height;
  const CELL = Math.min(W / COLS, H / ROWS);
  const OX = (W - CELL * COLS) / 2, OY = (H - CELL * ROWS) / 2;

  let board, current, over, winLine;

  function emptyBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  }

  function dropRow(col) {
    for (let r = ROWS - 1; r >= 0; r--) if (board[r][col] === 0) return r;
    return -1;
  }

  function wins(b, p) {
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        if (c + 3 < COLS && [0,1,2,3].every(k => b[r][c+k] === p)) return [[r,c],[r,c+3]];
        if (r + 3 < ROWS && [0,1,2,3].every(k => b[r+k][c] === p)) return [[r,c],[r+3,c]];
        if (c + 3 < COLS && r + 3 < ROWS && [0,1,2,3].every(k => b[r+k][c+k] === p)) return [[r,c],[r+3,c+3]];
        if (c - 3 >= 0 && r + 3 < ROWS && [0,1,2,3].every(k => b[r+k][c-k] === p)) return [[r,c],[r+3,c-3]];
      }
    return null;
  }

  function full(b) { return b.every(row => row.every(v => v)); }

  function scoreWindow(arr, p) {
    let s = 0;
    const opp = p === 1 ? 2 : 1;
    const c = arr.filter(v => v === p).length;
    const o = arr.filter(v => v === opp).length;
    const e = arr.filter(v => v === 0).length;
    if (c && !o) { if (c === 4) s += 100; else if (c === 3 && e) s += 8; else if (c === 2 && e) s += 2; }
    else if (o && !c) { if (o === 3 && e) s -= 12; }
    return s;
  }

  function evaluate(b, p) {
    let s = 0;
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c <= COLS - 4; c++)
        s += scoreWindow([b[r][c],b[r][c+1],b[r][c+2],b[r][c+3]], p);
    for (let c = 0; c < COLS; c++)
      for (let r = 0; r <= ROWS - 4; r++)
        s += scoreWindow([b[r][c],b[r+1][c],b[r+2][c],b[r+3][c]], p);
    for (let r = 0; r <= ROWS - 4; r++)
      for (let c = 0; c <= COLS - 4; c++)
        s += scoreWindow([b[r][c],b[r+1][c+1],b[r+2][c+2],b[r+3][c+3]], p);
    for (let r = 0; r <= ROWS - 4; r++)
      for (let c = 3; c < COLS; c++)
        s += scoreWindow([b[r][c],b[r+1][c-1],b[r+2][c-2],b[r+3][c-3]], p);
    return s;
  }

  function aiMove() {
    let best = -Infinity, bestCol = 3;
    for (let c = 0; c < COLS; c++) {
      const r = dropRow(c);
      if (r < 0) continue;
      const b = board.map(row => row.slice());
      b[r][c] = 2;
      if (wins(b, 2)) return c;
      let s = evaluate(b, 2);
      if (c === 3) s += 1;
      if (s > best) { best = s; bestCol = c; }
    }
    return bestCol;
  }

  function play(col, p) {
    const r = dropRow(col);
    if (r < 0) return false;
    board[r][col] = p;
    return true;
  }

  function cellFromEvent(e) {
    if (over || current !== 1) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (W / rect.width);
    const col = Math.floor((x - OX) / CELL);
    if (col < 0 || col >= COLS) return;
    if (dropRow(col) < 0) return;
    play(col, 1);
    const w = wins(board, 1);
    if (w) { over = true; winLine = w; messageEl.textContent = 'You win! 🎉'; statusEl.textContent = 'Win'; draw(); return; }
    if (full(board)) { over = true; messageEl.textContent = 'Draw!'; statusEl.textContent = 'Draw'; draw(); return; }
    current = 2;
    statusEl.textContent = 'AI…';
    draw();
    setTimeout(aiTurn, 350);
  }

  function aiTurn() {
    if (over) return;
    const col = aiMove();
    play(col, 2);
    const w = wins(board, 2);
    if (w) { over = true; winLine = w; messageEl.textContent = 'AI wins! Try again.'; statusEl.textContent = 'Loss'; draw(); return; }
    if (full(board)) { over = true; messageEl.textContent = 'Draw!'; statusEl.textContent = 'Draw'; draw(); return; }
    current = 1;
    statusEl.textContent = 'Your move';
    draw();
  }

  function draw() {
    ctx.fillStyle = '#0a0c1d';
    ctx.fillRect(0, 0, W, H);
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const x = OX + c * CELL, y = OY + r * CELL;
        ctx.fillStyle = '#101a3a';
        roundRect(ctx, x + 4, y + 4, CELL - 8, CELL - 8, 10); ctx.fill();
        const v = board[r][c];
        if (v) {
          ctx.save();
          ctx.shadowBlur = 16;
          ctx.shadowColor = v === 1 ? '#ff5a7a' : '#ffd166';
          ctx.fillStyle = v === 1 ? '#ff5a7a' : '#ffd166';
          ctx.beginPath();
          ctx.arc(x + CELL / 2, y + CELL / 2, CELL / 2 - 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    if (winLine) {
      ctx.strokeStyle = '#80ed99';
      ctx.lineWidth = 5;
      ctx.shadowBlur = 14; ctx.shadowColor = '#80ed99';
      ctx.beginPath();
      const a = winLine[0], b = winLine[1];
      ctx.moveTo(OX + a[1] * CELL + CELL / 2, OY + a[0] * CELL + CELL / 2);
      ctx.lineTo(OX + b[1] * CELL + CELL / 2, OY + b[0] * CELL + CELL / 2);
      ctx.stroke();
    }
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function newGame() {
    board = emptyBoard();
    current = 1; over = false; winLine = null;
    statusEl.textContent = 'Your move';
    messageEl.textContent = 'Your move, Red!';
    draw();
  }

  canvas.addEventListener('click', cellFromEvent);
  newBtn.addEventListener('click', newGame);
  newGame();
})();
