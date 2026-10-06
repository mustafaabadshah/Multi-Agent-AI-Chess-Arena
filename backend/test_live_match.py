import urllib.request
import json
import time

def test_full_match():
    # 1. Create match
    create_req = urllib.request.Request(
        'http://127.0.0.1:8000/api/games',
        data=json.dumps({
            'white_model': 'qwen/qwen3.8-27b',
            'black_model': 'openai/gpt-oss-120b',
            'white_personality': 'Strategic Aggressor',
            'black_personality': 'Positional Defender',
            'stockfish_depth': 12,
            'max_moves': 2
        }).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    game = json.loads(urllib.request.urlopen(create_req).read())
    game_id = game['id']
    print('Created Live Match:', game_id)

    # 2. Step Turn 1 (White - qwen/qwen3.8-27b)
    t0 = time.time()
    step1_req = urllib.request.Request(f'http://127.0.0.1:8000/api/games/{game_id}/next-move', data=b'', headers={'Content-Type': 'application/json'})
    json.loads(urllib.request.urlopen(step1_req).read())
    print('White (qwen/qwen3.8-27b) played move in', round(time.time() - t0, 2), 's')

    # 3. Step Turn 2 (Black - openai/gpt-oss-120b)
    t1 = time.time()
    step2_req = urllib.request.Request(f'http://127.0.0.1:8000/api/games/{game_id}/next-move', data=b'', headers={'Content-Type': 'application/json'})
    json.loads(urllib.request.urlopen(step2_req).read())
    print('Black (openai/gpt-oss-120b) played move in', round(time.time() - t1, 2), 's')

    # 4. Fetch telemetry
    moves_res = urllib.request.urlopen(f'http://127.0.0.1:8000/api/games/{game_id}/moves')
    moves = json.loads(moves_res.read())

    for m in moves:
        print(f"\n--- Move {m['ply']} ({m['color'].upper()}: {m['model']}) ---")
        print(f"Move: {m['san_move']} ({m['uci_move']})")
        print(f"Strategy: {m['strategy']}")
        print(f"Confidence: {m['confidence']}")
        print(f"Decision Summary: \"{m['decision_summary']}\"")
        print(f"Stockfish Eval Before/After: {m['stockfish_eval_before']} -> {m['stockfish_eval_after']}")
        print(f"CPL: {m['centipawn_loss']} cp | Quality: {m['move_quality']}")
        print(f"Stockfish Best Engine Move: {m['stockfish_best_move']}")

    # 5. Fetch Analysis
    analysis_res = urllib.request.urlopen(f'http://127.0.0.1:8000/api/games/{game_id}/analysis')
    analysis = json.loads(analysis_res.read())
    print(f"\nAnalysis Summary:")
    print(f"White Accuracy: {analysis['white']['accuracy_percentage']}% | Black Accuracy: {analysis['black']['accuracy_percentage']}%")
    print(f"Opening: {analysis['opening']}")

if __name__ == '__main__':
    test_full_match()
