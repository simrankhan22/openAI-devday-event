import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js';

const levels = [
  {title:'The Listening Grove', place:'Moonlit forest', description:'A wall of living roots blocks the old path. The portal waits somewhere beyond the grove.', target:'root gate', targetName:'Tangled moonroots', hint:'Try asking the roots to move in a way that fits a living forest.', good:/dance|sway|untangle|move|part|open|uncoil|grow apart/i, spell:'Verdant Waltz', spellHint:'A gentle rhythm can guide living plants.', color:0x76c9a1, kind:'roots', response:'The roots sway to your rhythm, uncoiling to reveal a path.'},
  {title:'The Shattered Span', place:'Aether ravine', description:'A broken bridge hangs over the clouds. A small spell may carry its pieces back together.', target:'bridge', targetName:'Broken skybridge', hint:'The bridge is made of stone, but it is light enough for magic.', good:/levitat|float|lift|rebuild|join|mend|repair|bridge together/i, spell:'Levitate', spellHint:'Weight is only a suggestion in the Aether.', color:0x88bff0, kind:'bridge', response:'The stones lift from the ravine and settle into a steady bridge.'},
  {title:'The Ember Perch', place:'Dragon’s highland', description:'A young dragon guards the mountain trail. It looks fierce, but it might only be lonely.', target:'dragon', targetName:'Ember dragon', hint:'The dragon is alert and curious. Think about what might earn its trust.', good:/sing|sooth|calm|lullab|friendly|befriend|comfort|music|feed|offer/i, spell:'Hearthsong', spellHint:'Even a dragon can be calmed by a kind voice.', color:0xf29c73, kind:'dragon', response:'The dragon purrs, then curls aside to let you pass.'},
  {title:'The Prism Archive', place:'Crystal library', description:'A sealed door has gone dark. Something in the archive can bring its colors back.', target:'crystal lock', targetName:'Prism seal', hint:'The seal responds to light, color, and careful attention.', good:/light|illumin|bright|shine|reflect|rainbow|glow|color/i, spell:'Prism Light', spellHint:'A beam of light reveals what was hidden.', color:0xc1a0ff, kind:'crystal', response:'Light blooms through the prism. The archive door glides open.'},
  {title:'The Starforge', place:'Clockwork foundry', description:'A sleepy stone guardian blocks the forge lift. Find a way to get its attention without a fight.', target:'golem', targetName:'Clockwork guardian', hint:'The guardian is old, tired, and built to follow simple requests.', good:/sleep|rest|music|dance|play|wake|ask|please|story|tea/i, spell:'Somnolent Chime', spellHint:'A soft chime can quiet restless machinery.', color:0xf0c578, kind:'golem', response:'The guardian gives a contented rumble and folds into a harmless rest.'},
  {title:'The Wyvern Gate', place:'Stormglass cliffs', description:'A storm has locked the gate with enchanted chains. The right element can loosen them.', target:'chains', targetName:'Stormbound chains', hint:'The chains crackle with cold magic. Match their nature with a thoughtful spell.', good:/warm|heat|fire|sun|melt|thaw|light|unbound|loosen|unlock|release/i, spell:'Sunflare', spellHint:'A little warmth can break a winter’s hold.', color:0xeaa57a, kind:'chains', response:'Sunlight races along the links. The chains fall away in a shimmer.'},
  {title:'The Witch’s Threshold', place:'The witching citadel', description:'The witch stands between you and the exit portal. Use what the spellbook has taught you to end her curse.', target:'witch', targetName:'The witch', hint:'She is protected by a veil of shadow. The spellbook may hold the answer.', good:/sunflare|sun burst|sunburst|sunlight|bright light|prism light|light spell|spell.*witch|witch.*spell/i, spell:'Sunburst', spellHint:'The final page: focus every light you have found into one bright spell.', color:0xec8fe2, kind:'witch', response:'Sunlight pierces the shadow veil. The witch dissolves into harmless sparks, and the portal opens.'}
];

const $ = (id) => document.getElementById(id);
const world = $('world');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101b28);
scene.fog = new THREE.FogExp2(0x101b28, 0.028);
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 100);
const renderer = new THREE.WebGLRenderer({antialias:true, alpha:false});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
world.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xd1e3ff, 0x3b302f, 2.0));
const sun = new THREE.DirectionalLight(0xffe2bf, 3.4);
sun.position.set(-7, 13, 6); sun.castShadow = true; sun.shadow.mapSize.set(1024,1024); scene.add(sun);
const fill = new THREE.PointLight(0x7cb8df, 22, 28); fill.position.set(2,5,-5); scene.add(fill);

const mat = (color, roughness=.8, metalness=0) => new THREE.MeshStandardMaterial({color, roughness, metalness});
const mats = {
  floor:mat(0x263634), stone:mat(0x53545b), stoneDark:mat(0x303943), wood:mat(0x55453c), leaf:mat(0x385f50), gold:mat(0xc49e5e,.43,.5), glow:new THREE.MeshStandardMaterial({color:0xb9f3d5,emissive:0x58b989,emissiveIntensity:1.25,roughness:.3}),
};
const clickable=[];
let levelIndex=0, selected=null, levelSolved=false, failedAttempts=0, hintRevealed=false, player, targetObject, portal, targetRing, props=[], spellNames=['Verdant Waltz'], yaw=0, dragging=false, dragX=0, toastTimer;
const keys=new Set();
const raycaster=new THREE.Raycaster();
const pointer=new THREE.Vector2();
const playerPosition=new THREE.Vector3(0,0,6);

function mesh(geometry, material, parent=scene, position=[0,0,0], cast=true){const m=new THREE.Mesh(geometry,material);m.position.set(...position);m.castShadow=cast;m.receiveShadow=true;parent.add(m);return m;}
function group(parent=scene,position=[0,0,0]){const g=new THREE.Group();g.position.set(...position);parent.add(g);return g;}
function makeTree(parent,x,z,scale=1){const g=group(parent,[x,0,z]);mesh(new THREE.CylinderGeometry(.18*scale,.28*scale,2.5*scale,7),mats.wood,g,[0,1.25*scale,0]);for(let i=0;i<3;i++){const c=mesh(new THREE.IcosahedronGeometry((1.0-i*.14)*scale,1),mat(i===1?0x426b57:0x345943),g,[0,(2.35+i*.48)*scale,0]);c.scale.set(1,.92,1)}return g;}
function makePortal(parent,x,z){const g=group(parent,[x,0,z]);const ring=mesh(new THREE.TorusGeometry(1.15,.12,12,44),mats.gold,g,[0,1.55,0]);ring.rotation.y=0;const core=mesh(new THREE.CircleGeometry(1.02,36),new THREE.MeshBasicMaterial({color:0x6bdcae,transparent:true,opacity:.42,side:THREE.DoubleSide}),g,[0,1.55,-.02]);const glow=mesh(new THREE.TorusGeometry(1.02,.035,8,44),mats.glow,g,[0,1.55,.02]);g.userData={ring,core,glow};return g;}
function addSelectable(object,key,name){object.userData.key=key;object.userData.label=name;object.userData.selectable=true;clickable.push(object);return object;}
function clearWorld(){while(scene.children.length>0){const o=scene.children[0];scene.remove(o)}scene.add(new THREE.HemisphereLight(0xd1e3ff,0x3b302f,2));scene.add(sun,fill);clickable.length=0;props=[];selected=null;targetObject=null;portal=null;}
function makeTarget(kind){
  const root=group(scene,[0,0,-1.8]); let obj;
  if(kind==='roots'){
    obj=group(root,[0,0,0]);for(let i=-2;i<=2;i++){const r=mesh(new THREE.CylinderGeometry(.16,.22,3.7,7),mat(0x526c4a),obj,[i*.48,1.8,0]);r.rotation.z=(i-2)*.14;mesh(new THREE.SphereGeometry(.37,8,7),mat(0x68784b),obj,[i*.48,3.65,0]);}
  } else if(kind==='bridge'){
    obj=group(root,[0,0,0]); for(let i=-1;i<=1;i++){const b=mesh(new THREE.BoxGeometry(1.1,.25,1.3),mat(0x697b8a),obj,[i*1.2,.2,0]);b.rotation.z=i*.1;}
    obj.position.x=-4.3;root.position.z=-2;
  } else if(kind==='dragon'){
    obj=group(root,[0,.15,-.1]);mesh(new THREE.SphereGeometry(.95,16,12),mat(0xa35338),obj,[0,1.2,0]).scale.set(1.4,.75,1);mesh(new THREE.SphereGeometry(.52,12,10),mat(0xcf7950),obj,[.95,1.65,-.05]);mesh(new THREE.ConeGeometry(.11,.55,6),mats.gold,obj,[1.3,1.56,-.23]).rotation.z=-.8;for(const s of [-1,1]){const w=mesh(new THREE.ConeGeometry(.72,1.25,4),mat(0xb55f43),obj,[s*.72,1.8,.18]);w.rotation.z=s===1?-.75:.75;mesh(new THREE.CylinderGeometry(.14,.2,.55,7),mat(0x653c36),obj,[s*.52,.55,0]);}
  } else if(kind==='crystal'){
    obj=group(root,[0,0,0]);mesh(new THREE.BoxGeometry(2.8,3.6,.3),mat(0x353849),obj,[0,1.8,0]);const c=mesh(new THREE.OctahedronGeometry(.8,0),new THREE.MeshStandardMaterial({color:0xc6a0ff,emissive:0x7552bb,emissiveIntensity:.8,metalness:.25,roughness:.2}),obj,[0,1.8,.28]);c.rotation.z=.2;for(let i=0;i<3;i++){const d=mesh(new THREE.OctahedronGeometry(.25,0),mats.glow,obj,[-.7+i*.7,.55,.35]);d.rotation.z=i;}
  } else if(kind==='golem'){
    obj=group(root,[0,0,0]);mesh(new THREE.BoxGeometry(1.65,1.6,.9),mat(0x777c79),obj,[0,1.4,0]);mesh(new THREE.SphereGeometry(.62,12,10),mat(0x818985),obj,[0,2.58,0]);for(const s of [-1,1]){mesh(new THREE.BoxGeometry(.5,1.15,.55),mat(0x646c6a),obj,[s*1.12,1.5,0]);mesh(new THREE.BoxGeometry(.48,1.0,.52),mat(0x555e5d),obj,[s*.48,.45,0]);}for(const x of [-.22,.22])mesh(new THREE.SphereGeometry(.08,8,8),mats.glow,obj,[x,2.63,.55]);
  } else if(kind==='chains'){
    obj=group(root,[0,0,0]);for(const x of [-1.6,1.6]){mesh(new THREE.BoxGeometry(.45,4,.45),mats.stone,obj,[x,2,0]);}for(let i=0;i<9;i++){const l=mesh(new THREE.TorusGeometry(.22,.065,7,12),new THREE.MeshStandardMaterial({color:0x9ec2da,metalness:.8,roughness:.25,emissive:0x34495c}),obj,[-1.45+i*.36,1.9+(i%2)*.08,.15]);l.rotation.y=Math.PI/2;}
  } else if(kind==='witch'){
    obj=group(root,[0,0,0]);const robe=mesh(new THREE.ConeGeometry(.85,2.3,7),mat(0x412949),obj,[0,1.15,0]);robe.rotation.y=.3;mesh(new THREE.SphereGeometry(.43,12,10),mat(0xb7a0a0),obj,[0,2.55,0]);const hat=mesh(new THREE.ConeGeometry(.52,1.0,7),mat(0x2a203e),obj,[0,3.15,0]);hat.rotation.z=-.12;mesh(new THREE.TorusGeometry(.49,.08,7,16),mats.gold,obj,[0,2.85,0]);for(let i=0;i<3;i++){const s=mesh(new THREE.SphereGeometry(.12,8,8),mat(0xad6de0,.3),obj,[-.9+i*.9,.6+(i%2)*.4,.3]);s.userData.float=true;}
  }
  addSelectable(obj,levels[levelIndex].target,levels[levelIndex].targetName);props.push({object:obj,kind});
  targetRing=mesh(new THREE.TorusGeometry(1.7,.025,6,44),new THREE.MeshBasicMaterial({color:levels[levelIndex].color,transparent:true,opacity:.75}),scene,[obj.position.x,.06,obj.position.z]);targetRing.rotation.x=Math.PI/2;
  return obj;
}
function buildScene(){
  clearWorld();failedAttempts=0;hintRevealed=false;$('hint-callout').classList.remove('visible');$('hint-copy').textContent='';const level=levels[levelIndex];scene.background=new THREE.Color(levelIndex>4?0x17152a:0x101b28);scene.fog=new THREE.FogExp2(levelIndex>4?0x17152a:0x101b28,.028);fill.color.setHex(level.color);fill.position.set(2,4,-5);
  const ground=mesh(new THREE.PlaneGeometry(22,32,1,1),mats.floor,scene,[0,-.13,-1],false);ground.rotation.x=-Math.PI/2;
  const edgeMat=mat(levelIndex>4?0x382d41:0x253b3c);
  for(const x of [-10.7,10.7])mesh(new THREE.BoxGeometry(.5,.55,32),edgeMat,scene,[x,.1,-1]);
  for(let i=0;i<18;i++){const x=(i%2?1:-1)*(5.8+(i%3)*1.4),z=-13+(i*7%27);makeTree(scene,x,z,.8+(i%3)*.15);}
  // A few old stones and lamps make the path legible without hiding the target.
  for(let z=-11;z<6;z+=4){for(const x of [-2.7,2.7]){const p=mesh(new THREE.BoxGeometry(.55,1.5,.55),mats.stoneDark,scene,[x,.75,z]);mesh(new THREE.SphereGeometry(.12,8,8),mats.glow,scene,[x,1.62,z]);}}
  // The exit is visible from the start and opens when the level task is solved.
  portal=makePortal(scene,0,-11.6);
  player=group(scene,[0,0,6]);mesh(new THREE.CapsuleGeometry(.34,.72,4,8),mat(0x455f70),player,[0,.86,0]);mesh(new THREE.SphereGeometry(.25,12,10),mat(0xe0bea0),player,[0,1.55,0]);const hood=mesh(new THREE.ConeGeometry(.34,.52,8),mat(0x283844),player,[0,1.92,0]);hood.rotation.x=.14;
  targetObject=makeTarget(level.kind);
  // Decorative clickable bench and spellbook make experimentation discoverable.
  const bench=group(scene,[-4.2,0,3]);mesh(new THREE.BoxGeometry(2,.18,.72),mats.wood,bench,[0,.65,0]);for(const x of [-.75,.75])mesh(new THREE.BoxGeometry(.16,.7,.16),mats.wood,bench,[x,.28,0]);addSelectable(bench,'bench','Old wooden bench');
  const book=group(scene,[4,0,1]);mesh(new THREE.BoxGeometry(.8,.13,.58),mat(0x5c3e47),book,[0,.18,0]);mesh(new THREE.BoxGeometry(.06,.16,.6),mats.gold,book,[0,.2,0]);mesh(new THREE.BoxGeometry(.36,.02,.46),mat(0xe0c890),book,[-.2,.27,0]);mesh(new THREE.BoxGeometry(.36,.02,.46),mat(0xd6bb88),book,[.2,.27,0]);addSelectable(book,'spellbook','Open spellbook');
  playerPosition.set(0,0,6);player.position.copy(playerPosition);yaw=0;updateCamera();
  spellNames=levelIndex===0?['Verdant Waltz']:levels.slice(0,levelIndex).map(l=>l.spell);
  renderUI();
}
function updateCamera(){const distance=7.2;const offset=new THREE.Vector3(Math.sin(yaw)*distance,4.1,Math.cos(yaw)*distance);camera.position.copy(playerPosition).add(offset);camera.lookAt(playerPosition.x,1.1,playerPosition.z-2.1);}
function setSelection(object){if(selected&&selected.material&&selected.material.emissive)selected.material.emissive.setHex(selected.userData.oldEmissive??0);selected=object||null;const row=document.querySelector('.selected-row');row.classList.toggle('active',!!selected);$('selected-name').textContent=selected?selected.userData.label:'Nothing selected';const input=$('prompt-input');input.disabled=!selected;input.placeholder=selected?`What should ${selected.userData.label.toLowerCase()} do?`:'Select something in the world first…';$('send-prompt').disabled=!selected;if(selected){input.focus();$('world-hint').textContent='Type a sensible action · press ENTER';}else $('world-hint').innerHTML='<span class="hint-key">CLICK</span> an object to focus it';}
function renderUI(){const l=levels[levelIndex];$('level-label').textContent=`LEVEL ${String(levelIndex+1).padStart(2,'0')} / 07`;$('level-title').textContent=l.title;$('level-description').textContent=l.description;$('objective-label').textContent=levelSolved?'Portal is open':'Find a way through';$('objective-state').textContent=levelSolved?'COMPLETE':'IN PROGRESS';$('objective-state').style.color=levelSolved?'#b9f3d5':'#e8c990';$('progress-fill').style.width=levelSolved?'100%':`${Math.max(15,(levelIndex+1)*12)}%`;$('spell-count').textContent=String(spellNames.length).padStart(2,'0');$('spell-list').innerHTML=spellNames.slice(-4).map((s,i)=>`<div class="spell-row"><span>${s}</span><span>KNOWN</span></div>`).join('');}
function showToast(text){const t=$('toast');t.textContent=text;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),3500);}
function selectUnderPointer(event){const rect=renderer.domElement.getBoundingClientRect();pointer.x=((event.clientX-rect.left)/rect.width)*2-1;pointer.y=-((event.clientY-rect.top)/rect.height)*2+1;raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(clickable,true)[0];if(!hit){setSelection(null);return}let o=hit.object;while(o&&!o.userData.selectable)o=o.parent;if(o)setSelection(o);}
function isCorrect(text,key){const l=levels[levelIndex];const q=text.trim().toLowerCase();if(key==='spellbook')return /read|open|study|look|check|spellbook|page|book/i.test(q);if(key==='bench')return /move|lift|carry|push|dance|sit|slide|shift/i.test(q);if(key!==l.target)return false;return l.good.test(q);}
function act(){const text=$('prompt-input').value.trim();if(!text||!selected)return;const key=selected.userData.key;
  if(key==='spellbook'&&isCorrect(text,key)){showToast(`Spellbook note — ${levels[levelIndex].spellHint}`);$('prompt-input').value='';return}
  if(key==='bench'&&isCorrect(text,key)){selected.position.x+=1.2;showToast('The bench scrapes across the stone. You hear a tiny magical chime.');$('prompt-input').value='';return}
  if(key!==levels[levelIndex].target||!isCorrect(text,key)){
    failedAttempts++;
    if(failedAttempts>=3&&!hintRevealed){hintRevealed=true;$('hint-copy').textContent=levels[levelIndex].hint;$('hint-callout').classList.add('visible');showToast(`Hint: ${levels[levelIndex].hint}`);}
    else showToast('That action does not fit this moment. Try something else.');
    $('prompt-input').select();return;
  }
  solveLevel();$('prompt-input').value='';
}
function solveLevel(){if(levelSolved)return;levelSolved=true;const level=levels[levelIndex];showToast(level.response);spellNames=Array.from(new Set([...spellNames,level.spell]));
  if(level.kind==='roots'){targetObject.rotation.z=.55;targetObject.children.forEach(c=>{c.rotation.z=(Math.random()-.5)*.7;});}
  if(level.kind==='bridge'){targetObject.position.x=0;targetObject.position.z=-1.8;}
  if(level.kind==='dragon'){targetObject.rotation.y=1.1;}
  if(level.kind==='crystal'){targetObject.children[1].material.emissiveIntensity=2.4;}
  if(level.kind==='golem'){targetObject.rotation.x=-.25;}
  if(level.kind==='chains'){targetObject.children.forEach(c=>c.rotation.x+=Math.PI/2);}
  if(level.kind==='witch'){targetObject.scale.setScalar(.01);}
  portal.userData.core.material.opacity=.85;portal.userData.glow.material.emissiveIntensity=2.8;
  renderUI();$('objective-label').textContent='Portal is open';$('objective-state').textContent='COMPLETE';
  if(levelIndex===levels.length-1){$('complete-title').textContent='The curse is broken';$('complete-copy').textContent='The exit portal is open. Step through and leave the citadel behind.';}else{$('complete-title').textContent='The path opens';$('complete-copy').textContent=`${level.place} is behind you. Step through the portal to continue.`;}
  $('level-complete').classList.add('visible');
}
function nextLevel(){if(levelIndex===levels.length-1){$('level-complete').classList.remove('visible');$('final-screen').classList.add('visible');return}levelIndex++;levelSolved=false;$('level-complete').classList.remove('visible');buildScene();showToast(`Spell learned: ${levels[levelIndex-1].spell}`);}
function restart(){levelIndex=0;levelSolved=false;spellNames=['Verdant Waltz'];$('final-screen').classList.remove('visible');buildScene();}
function onResize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}

renderer.domElement.addEventListener('click',selectUnderPointer);
renderer.domElement.addEventListener('pointerdown',e=>{if(e.button===2){dragging=true;dragX=e.clientX;renderer.domElement.setPointerCapture(e.pointerId);}});
renderer.domElement.addEventListener('pointermove',e=>{if(dragging){yaw-=(e.clientX-dragX)*.007;dragX=e.clientX;updateCamera();}});
renderer.domElement.addEventListener('pointerup',()=>dragging=false);
renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('keydown',e=>{if(['INPUT','TEXTAREA'].includes(document.activeElement.tagName))return;keys.add(e.key.toLowerCase());if(e.key==='Enter')act();});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
addEventListener('resize',onResize);
$('prompt-input').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();act();}});
$('send-prompt').addEventListener('click',act);
$('clear-selection').addEventListener('click',()=>setSelection(null));
$('enter-portal').addEventListener('click',nextLevel);
$('restart-game').addEventListener('click',restart);
$('help-button').addEventListener('click',()=>$('controls-note').classList.toggle('open'));
$('close-help').addEventListener('click',()=>$('controls-note').classList.remove('open'));

const clock=new THREE.Clock();
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);const forward=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));const right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));const dir=new THREE.Vector3();if(keys.has('w')||keys.has('arrowup'))dir.add(forward);if(keys.has('s')||keys.has('arrowdown'))dir.sub(forward);if(keys.has('d')||keys.has('arrowright'))dir.add(right);if(keys.has('a')||keys.has('arrowleft'))dir.sub(right);if(dir.lengthSq()&& !levelSolved){dir.normalize().multiplyScalar(dt*(keys.has('shift')?6.3:3.6));playerPosition.add(dir);playerPosition.x=THREE.MathUtils.clamp(playerPosition.x,-8.5,8.5);playerPosition.z=THREE.MathUtils.clamp(playerPosition.z,-9.6,7.5);player.position.copy(playerPosition);updateCamera();}
  const t=clock.elapsedTime;if(portal){portal.userData.ring.rotation.y=Math.sin(t*.45)*.07;portal.userData.core.material.opacity=(levelSolved ? .75 : .27)+Math.sin(t*1.8)*.08;portal.userData.glow.rotation.z=t*.2;}
  if(levelIndex===0&&targetObject&&!levelSolved)targetObject.rotation.z=Math.sin(t*1.2)*.035;
  if(targetRing)targetRing.material.opacity=.52+Math.sin(t*2)*.2;
  renderer.render(scene,camera);
}
buildScene();animate();
