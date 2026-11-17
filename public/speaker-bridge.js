// Audio stays on the parent page so Run can unlock it through a user gesture.
// Keep the official PXT tone scheduler and Sound.play promise semantics.
(function(){let session=0,nextId=0;const pending=new Map();const sendAudio=d=>parent.postMessage({ev3lab:true,type:'audio',runId:session,...d},'*');
 function stop(){sendAudio({action:'stop'});for(const finish of pending.values())finish();pending.clear();}
 window.LabSpeaker={begin(id){stop();session=id;sendAudio({action:'volume',volume:100});},stop};
 pxsim.AudioContextManager.tone=frequency=>sendAudio({action:'tone',frequency});
 pxsim.AudioContextManager.stop=stop;
 pxsim.SoundMethods.stop=stop;
 pxsim.SoundMethods.play=buf=>new Promise(resolve=>{const id=++nextId;pending.set(id,resolve);sendAudio({action:'wav',id,bytes:new Uint8Array(buf.data)});});
 const oldSet=pxsim.music.setVolume;pxsim.music.setVolume=volume=>{oldSet(volume);sendAudio({action:'volume',volume});};
 window.addEventListener('message',e=>{if(e.source!==parent||!e.data.ev3lab||e.data.type!=='lab-audio-ended'||e.data.runId!==session)return;const finish=pending.get(e.data.id);pending.delete(e.data.id);finish?.();});
})();
