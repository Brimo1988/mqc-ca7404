/* Écran de connexion : l'application (app.enc) est chiffrée en AES-256-GCM.
   La clé est dérivée du mot de passe (PBKDF2-SHA256). Sans le bon mot de passe, rien n'est lisible. */
(function(){
  'use strict';
  const SALT_B64 = 'H4cIun5qeBJbGMxmWDryzQ==', ITER = 250000, KEYSTORE = 'mqc_k';
  const b64d = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const b64e = u => btoa(String.fromCharCode.apply(null, new Uint8Array(u)));

  async function derive(pw){
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({name:'PBKDF2', salt:b64d(SALT_B64), iterations:ITER, hash:'SHA-256'}, base, {name:'AES-GCM', length:256}, true, ['decrypt']);
  }
  async function dec(key, buf){ return crypto.subtle.decrypt({name:'AES-GCM', iv:buf.slice(0,12)}, key, buf.slice(12)); }
  async function get(url){ const r = await fetch(url, {cache:'no-cache'}); if(!r.ok) throw new Error('HTTP '+r.status); return new Uint8Array(await r.arrayBuffer()); }

  async function start(key){
    const html = new TextDecoder().decode(await dec(key, await get('app.enc')));   // lève une erreur si la clé est fausse
    document.open(); document.write(html); document.close();
  }

  const form = document.getElementById('gate-form'), pw = document.getElementById('gate-pw'), msg = document.getElementById('gate-msg'), btn = document.getElementById('gate-btn'), rem = document.getElementById('gate-rem');
  if(!window.crypto || !crypto.subtle){ msg.textContent = 'Ce navigateur ne permet pas le déchiffrement. Ouvrez l\'adresse https dans Safari ou Chrome.'; btn.disabled = true; return; }

  form.addEventListener('submit', async e => {
    e.preventDefault(); if(!pw.value) return;
    btn.disabled = true; msg.className = ''; msg.textContent = 'Vérification…';
    try{
      const key = await derive(pw.value);
      let raw = null; if(rem.checked){ try{ raw = b64e(await crypto.subtle.exportKey('raw', key)); }catch(err){} }
      const html = new TextDecoder().decode(await dec(key, await get('app.enc')));
      if(raw){ try{ localStorage.setItem(KEYSTORE, raw); }catch(err){} } else { try{ localStorage.removeItem(KEYSTORE); }catch(err){} }
      document.open(); document.write(html); document.close();
    }catch(err){
      msg.className = 'err'; msg.textContent = (err && err.name === 'OperationError') ? 'Mot de passe incorrect.' : 'Connexion impossible. Vérifiez internet, puis réessayez.';
      btn.disabled = false; pw.select();
    }
  });

  (async () => {   // reconnexion automatique si « Rester connecté » a été coché
    let raw = null; try{ raw = localStorage.getItem(KEYSTORE); }catch(e){}
    if(raw){ try{ const key = await crypto.subtle.importKey('raw', b64d(raw), {name:'AES-GCM'}, true, ['decrypt']); await start(key); return; }catch(e){ try{ localStorage.removeItem(KEYSTORE); }catch(_){} } }
    pw.focus();
  })();

  if('serviceWorker' in navigator && location.protocol === 'https:'){ navigator.serviceWorker.register('sw.js').catch(()=>{}); }
})();
