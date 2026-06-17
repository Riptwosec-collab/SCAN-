function initScan3d(){
  const canvas=document.getElementById('scan3dCanvas');
  if(!canvas||!window.THREE)return;
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(45,1,.1,100);
  camera.position.set(0,1.1,5.2);

  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));

  const group=new THREE.Group();
  scene.add(group);

  const paperMaterial=new THREE.MeshBasicMaterial({color:0xbbf7d0,transparent:true,opacity:.16,side:THREE.DoubleSide});
  const lineMaterial=new THREE.LineBasicMaterial({color:0x86efac,transparent:true,opacity:.68});
  const blueLine=new THREE.LineBasicMaterial({color:0x93c5fd,transparent:true,opacity:.54});

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
    new THREE.MeshBasicMaterial({color:0x93c5fd,transparent:true,opacity:.14,wireframe:true})
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

  function animate(time){
    resize();
    group.rotation.y=Math.sin(time*.00055)*.22;
    group.rotation.x=Math.sin(time*.00038)*.06;
    cube.rotation.x=time*.0012;
    cube.rotation.y=time*.001;
    renderer.render(scene,camera);
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}

function initScan3dFallback(){
  const canvas=document.getElementById('scan3dCanvas');
  if(!canvas||window.THREE)return;
  const ctx=canvas.getContext('2d');
  function draw(time){
    const rect=canvas.getBoundingClientRect();
    canvas.width=Math.max(1,Math.floor(rect.width*(window.devicePixelRatio||1)));
    canvas.height=Math.max(1,Math.floor(rect.height*(window.devicePixelRatio||1)));
    ctx.setTransform(window.devicePixelRatio||1,0,0,window.devicePixelRatio||1,0,0);
    ctx.clearRect(0,0,rect.width,rect.height);
    ctx.strokeStyle='rgba(187,247,208,.52)';
    ctx.lineWidth=1;
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
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}

document.addEventListener('DOMContentLoaded',()=>{
  initScan3d();
  initScan3dFallback();
});
