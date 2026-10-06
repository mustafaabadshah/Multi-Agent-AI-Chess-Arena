# Research Mode & Benchmark Experiments

## Methodology

Research Mode allows automated, batch evaluation of competing LLMs over a series of games:
1. **Color Alternation**:
   - Odd games: Model A as White, Model B as Black.
   - Even games: Model B as White, Model A as Black.
   - Eliminates white-move initiative bias.
2. **Fixed Engine Referee**:
   - Both models are evaluated under identical Stockfish depth and move quality classification rules.
3. **Controlled Context**:
   - Each model receives the identical structured position context without leaking previous trial memory.
4. **Aggregate Benchmarks Computed**:
   - Win/Loss/Draw ratios.
   - Average Centipawn Loss (CPL).
   - Tactical Blunder Rate (blunders per move).
   - Average reported confidence vs engine accuracy calibration.
   - Strategic taxonomical preference.
