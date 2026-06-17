function initScan3d(){
  const canvas=document.getElementById('scan3dCanvas');
  if(!canvas||!window.THREE)return;
  const nextFrame=window.requestAnimationFrame
    ? window.requestAnimationFrame.bind(window)
    : callback=>window.setTimeout(()=>callback(Date.now()),33);
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(45,1,.1,100);
  camera.position.set(0,1.1,5.2);

  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));

  const group=new THREE.Group();
  scene.add(group);

  const THEME_SCAN_PALETTES={
    carbon:{paper:0xe7c370,line:0xffe6a3,alt:0xfff4c7,cube:0xf0ca67,paperOpacity:.18,lineOpacity:.94,altOpacity:.78},
    ivory:{paper:0x81520f,line:0x6f460b,alt:0x496d78,cube:0x8b5d16,paperOpacity:.16,lineOpacity:.92,altOpacity:.78},
    pearl:{paper:0x1f5b70,line:0x164f65,alt:0x346f82,cube:0x1f5b70,paperOpacity:.16,lineOpacity:.92,altOpacity:.80},
    sage:{paper:0xdcb656,line:0xffd873,alt:0x7ee0ac,cube:0xf0ca67,paperOpacity:.18,lineOpacity:.92,altOpacity:.78},
    midnight:{paper:0xe6c36a,line:0xffde7a,alt:0x9dccff,cube:0xf0d27a,paperOpacity:.18,lineOpacity:.92,altOpacity:.78}
  };
  let activeTheme='';
  const paperMaterial=new THREE.MeshBasicMaterial({color:0xbbf7d0,transparent:true,opacity:.16,side:THREE.DoubleSide});
  const lineMaterial=new THREE.LineBasicMaterial({color:0x86efac,transparent:true,opacity:.68});
  const blueLine=new THREE.LineBasicMaterial({color:0x93c5fd,transparent:true,opacity:.54});
  const cubeMaterial=new THREE.MeshBasicMaterial({color:0x93c5fd,transparent:true,opacity:.14,wireframe:true});

  function applyThemePalette(){
    const theme=document.body?.dataset?.theme||'carbon';
    if(theme===activeTheme)return;
    activeTheme=theme;
    const palette=THEME_SCAN_PALETTES[theme]||THEME_SCAN_PALETTES.carbon;
    paperMaterial.color.setHex(palette.paper);
    paperMaterial.opacity=palette.paperOpacity;
    lineMaterial.color.setHex(palette.line);
    lineMaterial.opacity=palette.lineOpacity;
    blueLine.color.setHex(palette.alt);
    blueLine.opacity=palette.altOpacity;
    cubeMaterial.color.setHex(palette.cube);
    cubeMaterial.opacity=Math.max(.26,palette.paperOpacity+.10);
  }

  for(let i=0;i<4;i++){
    const plane=new THREE.Mesh(new THREE.PlaneGeometry(1.35,1.78),paperMaterial);
    plane.position.x=(i-1.5)*1.05;
    plane.position.y=Math.sin(i)*.08;
    plane.position.z=-i*.18;
    plane.rotation.y=(i-1.5)*.12;
    group.add(plane);

    const edges=new THREE.LineSegments(new THREE.EdgesGeometry(plane.geometry),i%2?blueLine:lineMaterial);
    edges.position.copy(plane.position);
    edges.rotation.copy(plane.rotation);
    group.add(edges);

    for(let y=0;y<4;y++){
      const geo=new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-.42,.55-y*.26,0.01),
        new THREE.Vector3(.42,.55-y*.26,0.01)
      ]);
      const row=new THREE.Line(geo,i%2?blueLine:lineMaterial);
      row.position.copy(plane.position);
      row.rotation.copy(plane.rotation);
      group.add(row);
    }
  }

  const cube=new THREE.Mesh(
    new THREE.BoxGeometry(.5,.5,.5),
    cubeMaterial
  );
  cube.position.set(2.2,.35,-.2);
  group.add(cube);

  function resize(){
    const rect=canvas.getBoundingClientRect();
    const width=Math.max(1,Math.floor(rect.width));
    const height=Math.max(1,Math.floor(rect.height));
    renderer.setSize(width,height,false);
    camera.aspect=width/height;
    camera.updateProjectionMatrix();
  }

  resize();
  window.addEventListener('resize',resize,{passive:true});
  document.addEventListener('riptwosec:themechange',resize);

  function animate(time){
    applyThemePalette();
    resize();
    group.rotation.y=Math.sin(time*.00055)*.22;
    group.rotation.x=Math.sin(time*.00038)*.06;
    cube.rotation.x=time*.0012;
    cube.rotation.y=time*.001;
    renderer.render(scene,camera);
    nextFrame(animate);
  }
  nextFrame(animate);
}

function initScan3dFallback(){
  const canvas=document.getElementById('scan3dCanvas');
  if(!canvas||window.THREE)return;
  const ctx=canvas.getContext('2d');
  if(!ctx)return;
  const nextFrame=window.requestAnimationFrame
    ? window.requestAnimationFrame.bind(window)
    : callback=>window.setTimeout(()=>callback(Date.now()),33);
  const fallbackColors={
    carbon:'rgba(255,230,163,.86)',
    ivory:'rgba(111,70,11,.88)',
    pearl:'rgba(22,79,101,.88)',
    sage:'rgba(255,216,115,.86)',
    midnight:'rgba(255,222,122,.86)'
  };
  function draw(time){
    const rect=canvas.getBoundingClientRect();
    canvas.width=Math.max(1,Math.floor(rect.width*(window.devicePixelRatio||1)));
    canvas.height=Math.max(1,Math.floor(rect.height*(window.devicePixelRatio||1)));
    ctx.setTransform(window.devicePixelRatio||1,0,0,window.devicePixelRatio||1,0,0);
    ctx.clearRect(0,0,rect.width,rect.height);
    const theme=document.body?.dataset?.theme||'carbon';
    ctx.strokeStyle=fallbackColors[theme]||fallbackColors.carbon;
    ctx.lineWidth=1.35;
    for(let i=0;i<5;i++){
      const x=rect.width*.38+i*42+Math.sin(time*.001+i)*12;
      const y=32+i*10;
      ctx.strokeRect(x,y,82,54);
      ctx.beginPath();
      ctx.moveTo(x+12,y+18);
      ctx.lineTo(x+70,y+18);
      ctx.moveTo(x+12,y+31);
      ctx.lineTo(x+62,y+31);
      ctx.stroke();
    }
    nextFrame(draw);
  }
  nextFrame(draw);
}

function bootScan3d(){
  initScan3d();
  initScan3dFallback();
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',bootScan3d,{once:true});
}else{
  bootScan3d();
}
