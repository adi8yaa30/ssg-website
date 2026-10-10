"""Build a denser botanical landscape; run with Blender --background --python.
The merge step replaces only landscape meshes, preserving the hardware bytes,
node names, transforms and the five detachable panel nodes in the source GLB.
"""
import bpy, math, random, json, struct, copy
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'tools/backups/ssg-streetlight.original.glb'
OUT = ROOT / 'assets/01-hero/model/ssg-streetlight.web.glb'
TEMP = Path('/tmp/ssg-realism/landscape.glb')
random.seed(20261010)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
bpy.context.view_layer.update()
ground = bpy.data.objects['Ground']
terrain = BVHTree.FromPolygons([ground.matrix_world @ v.co for v in ground.data.vertices], [list(p.vertices) for p in ground.data.polygons])
solid_v=[]; solid_f=[]
for name in ['Footing','BasePlate','Rock_1','Rock_2','Pole']:
 o=bpy.data.objects[name]; off=len(solid_v)
 solid_v.extend(o.matrix_world@v.co for v in o.data.vertices)
 solid_f.extend([off+i for i in p.vertices] for p in o.data.polygons)
solids=BVHTree.FromPolygons(solid_v,solid_f)
D=Vector((0,0,-1))
def ground_at(x,y):
 hit,normal,index,dist=terrain.ray_cast(Vector((x,y,1)),D,2)
 return hit.z if hit and normal.z>.45 else None
sun=Vector((-.6,-.5,1)).normalized()
def shade(x,y,z):
 p=Vector((x,y,z+.012))
 occlusion=0
 for a in range(6):
  phi=a*math.tau/6
  ray=Vector((math.cos(phi)*.78,math.sin(phi)*.78,.63))
  hit,_,_,d=solids.ray_cast(p,ray,.65)
  if hit: occlusion += (1-d/.65)/6
 hit,_,_,_=solids.ray_cast(p,sun,2)
 return max(.32,1-occlusion*.85-(.20 if hit else 0))

def material(name,roughness):
 m=bpy.data.materials.new(name);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Roughness'].default_value=roughness
 c=m.node_tree.nodes.new('ShaderNodeVertexColor');c.layer_name='BotanicalColor'
 m.node_tree.links.new(c.outputs['Color'],p.inputs['Base Color']);m.diffuse_color=(.14,.3,.035,1)
 m.use_backface_culling=False
 return m

def mesh_obj(name,verts,faces,colors,mat):
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
 o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);mesh.materials.append(mat)
 attr=mesh.color_attributes.new(name='BotanicalColor',type='FLOAT_COLOR',domain='POINT')
 flat=[v for c in colors for v in (*c,1)]
 attr.data.foreach_set('color',flat)
 for p in mesh.polygons:p.use_smooth=True
 return o

# Tufts grow on the actual uneven soil surface, never through concrete or rocks.
verts=[];faces=[];colors=[];blade_count=0
for _ in range(16000):
 x=random.uniform(-.90,.92);y=random.uniform(-.9,.91)
 z=ground_at(x,y)
 if z is None:continue
 hit,_,_,_=solids.ray_cast(Vector((x,y,.9)),D,1.4)
 if hit and hit.z>z-.005:continue
 patch=.5+.25*math.sin(x*12+y*5)+.25*math.sin(y*18-x*7)
 tuft_angle=random.uniform(0,math.tau)
 for k in range(random.randint(3,5)):
  xx=x+random.uniform(-.012,.012);yy=y+random.uniform(-.012,.012)
  zz=ground_at(xx,yy)
  if zz is None:continue
  hit,_,_,_=solids.ray_cast(Vector((xx,yy,.7)),D,1.2)
  if hit and hit.z>zz-.005:continue
  h=random.uniform(.048,.115)*(.8+.35*patch)
  if random.random()<.09:h*=1.45
  width=random.uniform(.004,.0075)
  angle=tuft_angle+k*2.4+random.uniform(-.7,.7)
  bend=h*random.uniform(.25,.95)
  dx,dy=math.cos(angle),math.sin(angle)
  # Ribbon width twists independently of its bend, avoiding identical flat fins.
  wa=angle+random.uniform(-.7,.7);wx,wy=-math.sin(wa),math.cos(wa)
  ao=shade(xx,yy,zz);v=random.uniform(.62,1.22)
  green=(.09+.06*patch,.22+.13*patch,.014+.025*patch)
  if random.random()<.045:green=(.27,.25,.085) # restrained dry blades
  start=len(verts)
  for t,w in [(0,.48),(.35,.5),(.72,.30)]:
   cx=xx+dx*bend*t*t;cy=yy+dy*bend*t*t;cz=zz-.004+h*(t-.16*t*t)
   tone=(.38+.62*t)*ao*v
   for side in [-1,1]:
    verts.append((cx+wx*width*w*side,cy+wy*width*w*side,cz))
    colors.append(tuple(c*tone for c in green))
  verts.append((xx+dx*bend,yy+dy*bend,zz+h*.84))
  colors.append(tuple(c*ao*v*1.06 for c in green))
  faces.extend([(start,start+1,start+3,start+2),(start+2,start+3,start+5,start+4),(start+4,start+5,start+6)])
  blade_count+=1
bpy.data.objects.remove(bpy.data.objects['Individual grass blades'],do_unlink=True)
grass=mesh_obj('Individual grass blades',verts,faces,colors,material('Living grass — shaded roots and fresh tips',.86))
print('GRASS BLADES',blade_count,flush=True)

# Small folded leaves arranged in pairs along woody stems, with open silhouettes.
verts=[];faces=[];colors=[];stem_v=[];stem_f=[];stem_c=[]
def leaf(base,direction,length,width,tone):
 axis=Vector(direction).normalized();side=axis.cross(Vector((0,0,1))).normalized()
 if side.length<.01:side=Vector((1,0,0))
 start=len(verts)
 for i in range(5):
  t=i/4;center=base+axis*(length*t)+Vector((0,0,length*.22*math.sin(t*math.pi)))
  w=width*math.sin(t*math.pi)**.8
  for s in [-1,0,1]:
   p=center+side*(w*s);p.z-=abs(s)*w*.24
   verts.append(tuple(p));brightness=tone*(.72+.3*t)*(1 if s==0 else .87)
   colors.append((.105*brightness,.25*brightness,.018*brightness))
 for i in range(4):
  a=start+i*3
  faces.extend([(a,a+3,a+4,a+1),(a+1,a+4,a+5,a+2)])
def stem(points,radius,tone):
 start=len(stem_v)
 for i,p in enumerate(points):
  for k in range(5):
   a=k*math.tau/5;r=radius*(1-.8*i/(len(points)-1))
   stem_v.append(tuple(p+Vector((r*math.cos(a),r*math.sin(a),0))))
   stem_c.append((.10*tone,.085*tone,.029*tone))
 for i in range(len(points)-1):
  for k in range(5):
   a=start+i*5+k;b=start+i*5+(k+1)%5
   stem_f.append((a,b,b+5,a+5))
for cx,cy,radius,height in [(-.49,.43,.29,.56),(.47,.40,.27,.46),(.06,.65,.23,.40)]:
 gz=ground_at(cx,cy) or -.28
 for j in range(96):
  a=random.random()*math.tau;r=radius*math.sqrt(random.random())
  bx=cx+math.cos(a)*r*.35;by=cy+math.sin(a)*r*.35
  h=height*random.uniform(.65,1.13)*(1-.26*r/radius)
  lean=Vector((math.cos(a)*r,math.sin(a)*r,0))
  root=Vector((bx,by,gz))
  points=[root+lean*(t*t)+Vector((0,0,h*t)) for t in [0,.25,.5,.75,1]]
  tone=random.uniform(.65,1.25)
  stem(points,.0023,tone)
  phase=random.random()*math.tau
  for k in range(3,11):
   t=k/11;base=root+lean*t*t+Vector((0,0,h*t))
   size=random.uniform(.052,.084)*(1-.20*t)
   for sign in [-1,1]:
    a2=phase+k*.36+(math.pi if sign==-1 else 0)
    direction=(math.cos(a2),math.sin(a2),random.uniform(.24,.7))
    leaf(base,direction,size,size*random.uniform(.25,.34),tone*(.55+.45*t))
  leaf(points[-1],(lean.x,lean.y,1),.045,.009,tone)
bpy.data.objects.remove(bpy.data.objects['Plants'],do_unlink=True)
plants=mesh_obj('Plants',verts,faces,colors,material('Botanical leaves — folded midribs',.7))
stems=mesh_obj('Shrub stems',stem_v,stem_f,stem_c,material('Natural woody stems',.95))
# Bake local occlusion and sun visibility into vertex colors. This gives roots,
# leaf interiors and overlaps depth without adding a shadow pass on every scroll.
all_v=list(solid_v);all_f=list(solid_f)
for obj in [grass,plants,stems]:
 off=len(all_v);all_v.extend(v.co.copy() for v in obj.data.vertices)
 all_f.extend([off+i for i in p.vertices] for p in obj.data.polygons)
landscape=BVHTree.FromPolygons(all_v,all_f)
rays=[Vector((math.cos(a*math.tau/5)*.8,math.sin(a*math.tau/5)*.8,.6)) for a in range(5)]
for obj in [grass,plants,stems]:
 attr=obj.data.color_attributes['BotanicalColor']
 for v in obj.data.vertices:
  point=v.co+Vector((0,0,.002))
  blocked=0
  for ray in rays:
   hit,_,_,distance=landscape.ray_cast(point,ray,.24)
   if hit:blocked+=(1-distance/.24)/5
  hit,_,_,_=landscape.ray_cast(point,sun,1.5)
  shadow=.70 if hit else 1.0
  shade_value=max(.22,1-.83*blocked)*shadow
  c=attr.data[v.index].color
  attr.data[v.index].color=(c[0]*shade_value*.65,c[1]*shade_value*.76,c[2]*shade_value*.57,1)
 print('BAKED',obj.name,flush=True)

# Export only replacement meshes, then merge them into the untouched original GLB.
bpy.ops.object.select_all(action='DESELECT')
for o in [grass,plants,stems]:o.select_set(True)
bpy.context.view_layer.objects.active=grass
TEMP.parent.mkdir(exist_ok=True,parents=True)
bpy.ops.export_scene.gltf(filepath=str(TEMP),use_selection=True,export_format='GLB',export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,export_draco_position_quantization=16,export_draco_color_quantization=8,export_vertex_color='ACTIVE',export_all_vertex_colors=False)
def read(path):
 b=path.read_bytes();n=struct.unpack_from('<I',b,12)[0];return json.loads(b[20:20+n]),bytearray(b[28+n:])
a,ab=read(SOURCE);b,bb=read(TEMP)
off={k:len(a.get(k,[])) for k in ['bufferViews','accessors','materials','meshes']}
while len(ab)%4:ab.append(0)
byteoff=len(ab);ab.extend(bb)
for v in b.get('bufferViews',[]):
 v['buffer']=0;v['byteOffset']=v.get('byteOffset',0)+byteoff
for acc in b.get('accessors',[]):
 if 'bufferView' in acc:acc['bufferView']+=off['bufferViews']
for m in b.get('meshes',[]):
 for p in m['primitives']:
  p['attributes']={k:v+off['accessors'] for k,v in p['attributes'].items()}
  if 'indices' in p:p['indices']+=off['accessors']
  if 'material' in p:p['material']+=off['materials']
  ext=p.get('extensions',{}).get('KHR_draco_mesh_compression')
  if ext:ext['bufferView']+=off['bufferViews']
for k in off:a.setdefault(k,[]).extend(b.get(k,[]))
for node in b['nodes']:
 if 'mesh' not in node:continue
 node['mesh']+=off['meshes']
 old=next((n for n in a['nodes'] if n.get('name')==node.get('name')),None)
 if old is not None:old['mesh']=node['mesh']
 else:
  a['scenes'][a.get('scene',0)]['nodes'].append(len(a['nodes']));a['nodes'].append(node)
for k in ['extensionsUsed','extensionsRequired']:
 a[k]=list(dict.fromkeys(a.get(k,[])+b.get(k,[])))
a['buffers']=[{'byteLength':len(ab)}]
a.setdefault('extras',{})['landscape']='Dense curved grass and paired botanical leaves; hardware and panel hierarchy preserved.'
j=json.dumps(a,separators=(',',':')).encode();j+=b' '*((-len(j))%4);ab+=b'\0'*((-len(ab))%4)
OUT.write_bytes(struct.pack('<III',0x46546c67,2,28+len(j)+len(ab))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(ab),0x004e4942)+ab)
print('WROTE',OUT,OUT.stat().st_size,flush=True)
