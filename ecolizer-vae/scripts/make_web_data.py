"""Wrap the exported JSON into a plain script so the article also works when opened from disk (no fetch)."""
import json, os
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
vae = json.load(open(os.path.join(root, 'data', 'vae_data.json')))
exp = json.load(open(os.path.join(root, 'data', 'explorer_data.json')))
with open(os.path.join(root, 'assets', 'js', 'data.js'), 'w') as f:
    f.write('window.ECO = ' + json.dumps({'vae': vae, 'explorer': exp}, separators=(',', ':')) + ';\n')
print('data.js written')
