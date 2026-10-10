"""Check that landscape edits preserve the GLB's hardware and local-file copy."""
import base64,json,struct
from pathlib import Path
root=Path(__file__).resolve().parent.parent

def read(path):
 data=path.read_bytes()
 assert struct.unpack_from('<III',data)[0:2]==(0x46546c67,2)
 assert struct.unpack_from('<I',data,8)[0]==len(data)
 n=struct.unpack_from('<I',data,12)[0]
 return json.loads(data[20:20+n]),data[28+n:],data
old,oldbin,_=read(root/'tools/backups/ssg-streetlight.original.glb')
new,newbin,raw=read(root/'assets/01-hero/model/ssg-streetlight.web.glb')
changed={'Individual grass blades','Plants'}
assert newbin[:len(oldbin)]==oldbin, 'Original hardware/texture data changed'
for node in old['nodes']:
 current=next(n for n in new['nodes'] if n['name']==node['name'])
 if node['name'] not in changed:assert node==current, node['name']
 else:assert current['mesh']!=node['mesh']
assert new['meshes'][:len(old['meshes'])]==old['meshes']
assert new['materials'][:len(old['materials'])]==old['materials']
assert new['images']==old['images']
assert len([n for n in new['nodes'] if n['name'].startswith('Panel frame corner fixing')])==4
for view in new['bufferViews']:
 assert view.get('byteOffset',0)+view['byteLength']<=len(newbin)
for mesh in new['meshes']:
 for p in mesh['primitives']:
  for a in p['attributes'].values():assert a<len(new['accessors'])
  assert p['indices']<len(new['accessors'])
  assert p['material']<len(new['materials'])
for name in changed|{'Shrub stems'}:
 n=next(n for n in new['nodes'] if n['name']==name)
 for p in new['meshes'][n['mesh']]['primitives']:assert 'COLOR_0' in p['attributes']
embedded=(root/'assets/01-hero/model/ssg-streetlight.web.glb.js').read_text()
b64=json.loads(embedded.split(' = ',2)[-1].strip().rstrip(';'))
assert base64.b64decode(b64)==raw
assert len(raw)<6_000_000
print('PASS: original hardware, textures, node transforms and all 4 panel fixings preserved.')
print('PASS: landscape vertex colors, buffer/accessor references and embedded file copy valid.')
print(f'PASS: GLB {len(raw)/1e6:.2f} MB, below the 6 MB asset budget.')
