// ============ Hilfen ============
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

// Sanft scrollen
$('#btnStart').addEventListener('click', () =>
  document.getElementById('quiz').scrollIntoView({behavior:'smooth'})
);

// ============ Datensatz ============
const CSV_PATH = 'personality_datasert.csv';       // Muss im selben Ordner liegen
const LABEL_COL = 'Personality';                   // Zielspalte im CSV

// 7 Fragen (fix)
const QUESTIONS = [
  { key:'Social_event_attendance', label:'How often do you go on social events', type:'numeric', min:0, max:10, step:1 },
  { key:'Going_outside', label:'How often do you go outside', type:'numeric', min:0, max:7, step:1 },
  { key:'Time_spent_Alone', label:'How much time do you spend alone (per day)', type:'numeric', min:0, max:11, step:1 },
  { key:'Friends_circle_size', label:'How big is your friends circle', type:'numeric', min:0, max:15, step:1 },
  { key:'Post_frequency', label:'How often do you post on social media', type:'numeric', min:0, max:10, step:1 },
  { key:'Stage_fear', label:'Do you have stage fear', type:'boolean' },
  { key:'Drained_after_socializing', label:'Do you feel drained after socializing', type:'boolean' },
];

let DATA = [];            // CSV rows
const ANSWERS = {};       // user answers

// ============ UI: Inputs verdrahten ============
function initQuizControls(){
  // Slider
  $$('.range-input').forEach(inp => {
    const key = inp.dataset.key;
    // Default: Mitte
    const min = +inp.min, max = +inp.max;
    const mid = Math.round((min+max)/2);
    inp.value = mid;
    ANSWERS[key] = +inp.value;
    const b = document.querySelector(`.value-bubble[data-bubble="${key}"]`);
    if(b) b.textContent = inp.value;

    inp.addEventListener('input', e=>{
      ANSWERS[key] = +e.target.value;
      if(b) b.textContent = e.target.value;
    });
  });

  // YES/NO
  $$('.btn-yes, .btn-no').forEach(btn=>{
    const key = btn.dataset.key;
    btn.addEventListener('click', ()=>{
      ANSWERS[key] = btn.dataset.v;   // 'Yes' oder 'No'
      // Aktiven Button hervorheben
      btn.parentElement.querySelectorAll('button').forEach(b=>b.style.outline='none');
      btn.style.outline = '3px solid rgba(0,0,0,.15)';
    });
  });

  // Fertig
  $('#btnFinish').addEventListener('click', evaluateAll);
}

// ============ Auswertung ============
function globalExtroShare(){
  const ext = DATA.filter(d => d[LABEL_COL]==='Extrovert').length;
  const tot = DATA.length || 1;
  return ext / tot;  // ca. 0.51–0.52 in deinem Datensatz
}

// Anteil Extro für eine gegebene Antwort (per CSV gefiltert)
function extroShareForAnswer(key, value){
  // Für numerische Features: ±1 Toleranz (Skalen sind diskret)
  const tol = 1;

  const subset = DATA.filter(row=>{
    const v = row[key];
    if(v==null || v==='') return false;

    // boolean JA/NEIN Felder haben 'Yes'/'No' im Datensatz
    if(QUESTIONS.find(q=>q.key===key).type==='boolean'){
      return String(v).toLowerCase() === String(value).toLowerCase();
    }else{
      const x = +v;
      if(isNaN(x)) return false;
      return Math.abs(x - (+value)) <= tol;
    }
  });

  if(subset.length===0) return globalExtroShare();

  const ext = subset.filter(r => r[LABEL_COL]==='Extrovert').length;
  return ext / subset.length;
}

function mean(arr){ return arr.reduce((s,v)=>s+v,0)/Math.max(1,arr.length); }

function evaluateAll(){
  // Wahrscheinlichkeit extro über alle Antworten mitteln
  const shares = QUESTIONS
    .filter(q => ANSWERS[q.key]!==undefined)
    .map(q => extroShareForAnswer(q.key, ANSWERS[q.key]));

  const pExtro = shares.length ? mean(shares) : globalExtroShare();

  renderColoredGrid(pExtro);
  renderPerQuestionComparisons();
  document.getElementById('results').scrollIntoView({behavior:'smooth'});
}

// ============ Ergebnis-Grid (Bild 6) ============
function renderColoredGrid(pExtro){
  $('#gridInitial').style.display='none';
  $('#gridColored').style.display='block';

  const cells = $$('#gridColored .av');
  cells.forEach(c => c.classList.remove('bg-blue','bg-red'));
  const half = Math.floor(cells.length/2);
  cells.forEach((c,i)=> c.classList.add(i<half ? 'bg-red' : 'bg-blue'));

  const left = $('#slot-left'), right = $('#slot-right');
  left.innerHTML=''; right.innerHTML='';
  const me = new Image(); me.src='me.svg'; me.alt='me'; me.style.width='72px';

  if(pExtro >= 0.5){ right.style.display='block'; left.style.display='none'; right.appendChild(me); }
  else{ left.style.display='block'; right.style.display='none'; left.appendChild(me); }
}

// ============ Vergleiche pro Frage (Bild 7) ============
function renderPerQuestionComparisons(){
  const box = $('#compareContainer'); box.innerHTML='';

  QUESTIONS.forEach(q=>{
    const card = document.createElement('div');
    card.className = 'compare-card';
    card.innerHTML = `<div class="compare-title">${q.label}</div>`;

    if(q.type==='boolean'){
      // Avatar-Zeile + YES/NO Buttons (ohne Schleifen eingebunden)
      card.innerHTML += `
        <div class="mini-grid" id="mini-${q.key}">
          <div class="mini-av"><img src="person_3.svg" alt="p3"></div>
          <div class="mini-av"><img src="person_7.svg" alt="p7"></div>
          <div class="mini-av"><img src="person_2.svg" alt="p2"></div>
          <div></div>
          <div class="mini-av"><img src="person_5.svg" alt="p5"></div>
          <div class="mini-av"><img src="person_9.svg" alt="p9"></div>
          <div class="mini-av"><img src="person_4.svg" alt="p4"></div>
        </div>
        <div class="compare-controls">
          <button class="btn-pill btn-no"  data-k="${q.key}" data-v="No">NO</button>
          <button class="btn-pill btn-yes" data-k="${q.key}" data-v="Yes">YES</button>
        </div>
      `;
      const apply = (val) => colorMini(`#mini-${q.key}`, extroShareForAnswer(q.key, val));
      apply(ANSWERS[q.key] ?? 'No');
      card.querySelectorAll('button').forEach(b =>
        b.addEventListener('click', () => { ANSWERS[q.key]=b.dataset.v; apply(b.dataset.v); })
      );

    }else{
      // Skala mit me.svg + veränderbarer Antwort
      card.innerHTML += `
        <div class="scale-small" id="scale-${q.key}">
          <div class="range-bg" aria-hidden="true"></div>
          <img class="me-on-scale" src="me.svg" alt="me" />
          <input class="range-input" type="range" min="${q.min}" max="${q.max}" step="${q.step||1}" value="${ANSWERS[q.key] ?? Math.round((q.min+q.max)/2)}" />
          <div class="value-bubble" id="bubble-${q.key}"></div>
        </div>
        <div class="mini-grid" id="mini-${q.key}">
          <div class="mini-av"><img src="person_3.svg" alt="p3"></div>
          <div class="mini-av"><img src="person_7.svg" alt="p7"></div>
          <div class="mini-av"><img src="person_2.svg" alt="p2"></div>
          <div></div>
          <div class="mini-av"><img src="person_5.svg" alt="p5"></div>
          <div class="mini-av"><img src="person_9.svg" alt="p9"></div>
          <div class="mini-av"><img src="person_4.svg" alt="p4"></div>
        </div>
      `;
      const input = card.querySelector('input');
      const meImg = card.querySelector('.me-on-scale');
      const bubble = card.querySelector(`#bubble-${q.key}`);

      const update = ()=>{
        const v = +input.value; ANSWERS[q.key]=v;
        bubble.textContent = v;
        const pct = (v - q.min) / Math.max(1, q.max - q.min);
        meImg.style.left = `calc(${(pct*100).toFixed(2)}% - 23px)`;
        colorMini(`#mini-${q.key}`, extroShareForAnswer(q.key, v));
      };
      input.addEventListener('input', update);
      update();
    }

    box.appendChild(card);
  });
}

function colorMini(selector, ratioBlue){
  const cells = Array.from(document.querySelectorAll(`${selector} .mini-av`));
  if(!cells.length) return;
  cells.forEach(c=> c.classList.remove('bg-blue','bg-red'));
  const n = cells.length, half = Math.floor(n/2);
  cells.forEach((c,i)=> c.classList.add(i<half ? 'bg-red' : 'bg-blue'));
  cells[0].classList.add('bg-red'); cells[n-1].classList.add('bg-blue'); // nie alle gleich
}

// ============ Start ============
initQuizControls();
d3.csv(CSV_PATH).then(rows=>{
  DATA = rows;
}).catch(err=>{
  console.warn('CSV konnte nicht geladen werden:', err);
});
