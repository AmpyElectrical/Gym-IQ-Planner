import { useState, useRef, useEffect, useCallback } from "react";

// ─── THEME ────────────────────────────────────────────────────────────────────
const T = {
  bg:"#000",card:"#161616",cardHover:"#1E1E1E",input:"#1E1E1E",
  accent:"#FF5F1F",accentGlow:"0 0 28px rgba(255,95,31,0.28)",
  text:"#F5F5F5",muted:"#666",border:"#222",success:"#22C55E",danger:"#EF4444",
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800;900&family=Barlow+Condensed:wght@700;800;900&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  html,body{background:#000;color:#F5F5F5;font-family:'Barlow',sans-serif;overscroll-behavior:none;}
  input,textarea,select{background:#1E1E1E;color:#F5F5F5;border:1px solid #222;outline:none;border-radius:10px;padding:10px 14px;font-family:'Barlow',sans-serif;font-size:14px;width:100%;transition:border-color .2s;}
  input:focus,textarea:focus,select:focus{border-color:#FF5F1F;}
  input::placeholder,textarea::placeholder{color:#666;}
  select option{background:#161616;}
  button{cursor:pointer;font-family:'Barlow',sans-serif;}
  textarea{resize:none;}
  ::-webkit-scrollbar{width:3px;}
  ::-webkit-scrollbar-thumb{background:#222;border-radius:4px;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
  @keyframes pulse{0%,100%{opacity:.4;}50%{opacity:1;}}
  @keyframes popIn{0%{transform:scale(0.7);opacity:0;}70%{transform:scale(1.08);}100%{transform:scale(1);opacity:1;}}
  @keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
  .fade-up{animation:fadeUp .3s ease both;}
  .pop-in{animation:popIn .4s cubic-bezier(.34,1.56,.64,1) both;}
  .bc{font-family:'Barlow Condensed',sans-serif;}
  .spin{animation:spin 1s linear infinite;}
`;

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const fmtDate = d => new Date(d).toLocaleDateString("en-AU",{day:"numeric",month:"short"});
const today = () => new Date().toISOString().split("T")[0];
const e1RM = (w,r) => r===1?w:Math.round(w*(1+r/30)*10)/10;

const BODY_PARTS = [
  {id:"chest",    label:"Chest",     icon:"💪", color:"#FF5F1F"},
  {id:"back",     label:"Back",      icon:"🔙", color:"#FF8C42"},
  {id:"shoulders",label:"Shoulders", icon:"🏔️", color:"#FBBF24"},
  {id:"arms",     label:"Arms",      icon:"💪", color:"#A78BFA"},
  {id:"legs",     label:"Legs",      icon:"🦵", color:"#34D399"},
  {id:"core",     label:"Core",      icon:"🎯", color:"#22D3EE"},
  {id:"cardio",   label:"Cardio",    icon:"🏃", color:"#F472B6"},
];

const BUCKETS = [
  {id:"1",    label:"1 RM",   range:[1,1],   color:"#FF5F1F"},
  {id:"2-3",  label:"2–3 RM", range:[2,3],   color:"#FF8C42"},
  {id:"3-5",  label:"3–5 RM", range:[3,5],   color:"#FBBF24"},
  {id:"5-8",  label:"5–8 RM", range:[5,8],   color:"#34D399"},
  {id:"8-12", label:"8–12 RM",range:[8,12],  color:"#60A5FA"},
  {id:"12+",  label:"12+ RM", range:[12,999],color:"#A78BFA"},
];

const getBucket = r => BUCKETS.find(b=>r>=b.range[0]&&r<=b.range[1])||BUCKETS[BUCKETS.length-1];
const getBestE1RM = liftData => {
  if(!liftData) return null;
  let best=null;
  Object.values(liftData).forEach(arr=>arr.forEach(e=>{
    const est=e1RM(e.weight,e.reps);
    if(!best||est>best.est) best={...e,est};
  }));
  return best;
};
const getBucketBest = (liftData,bid) => {
  const arr=liftData?.[bid]||[];
  return arr.length?arr.reduce((b,e)=>e.weight>b.weight?e:b,arr[0]):null;
};

// ─── EXERCISE DESCRIPTION RENDERER ───────────────────────────────────────────
function ExerciseDesc({desc}){
  const [simple, setSimple] = useState(true);
  if(!desc) return null;

  const lines = desc.split("\\n").filter(Boolean);
  const sections = lines.map(line => {
    const colonIdx = line.indexOf(":");
    const label = line.substring(0, colonIdx).trim();
    const full = line.substring(colonIdx + 1).trim();
    const parts = full.split(" | ");
    const simpleText = parts[0].trim();
    const detailText = parts.length > 1 ? parts[1].trim() : parts[0].trim();
    const isTargets = label.includes("🎯");
    const isHow = label.includes("📋");
    const isTip = label.includes("💡");
    const labelColor = isTargets ? "#34D399" : isHow ? T.accent : isTip ? "#FBBF24" : T.text;
    const labelClean = label.replace(/🎯|📋|💡/g,"").trim();
    return { labelClean, labelColor, simpleText, detailText, isTargets };
  });

  // Split "How to do it" sentences into individual lines for clarity
  const renderText = (text, isTargets) => {
    if(isTargets) return <div style={{fontSize:14,color:"#ddd",lineHeight:1.7}}>{text}</div>;
    // Split on ". " to get individual sentences/steps
    const sentences = text.split(/\. /).map(s => s.trim()).filter(Boolean);
    if(sentences.length <= 1) return <div style={{fontSize:14,color:"#ddd",lineHeight:1.7}}>{text}</div>;
    return (
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {sentences.map((s,i) => (
          <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start"}}>
            <span style={{color:T.accent,fontWeight:800,fontSize:12,marginTop:3,flexShrink:0}}>{i+1}.</span>
            <span style={{fontSize:14,color:"#ddd",lineHeight:1.6}}>{s.endsWith(".")?s:s+"."}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{background:T.input,borderRadius:12,padding:"16px",marginTop:6,marginBottom:4}}>
      {/* Simple / Detailed toggle */}
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}>
        <div style={{display:"flex",background:T.card,borderRadius:50,padding:3,gap:2}}>
          <button onClick={()=>setSimple(true)} style={{
            borderRadius:50,padding:"4px 14px",fontSize:11,fontWeight:700,border:"none",cursor:"pointer",
            background:simple?T.accent:"transparent",color:simple?"#fff":T.muted,transition:"all .2s"
          }}>Simple</button>
          <button onClick={()=>setSimple(false)} style={{
            borderRadius:50,padding:"4px 14px",fontSize:11,fontWeight:700,border:"none",cursor:"pointer",
            background:!simple?T.accent:"transparent",color:!simple?"#fff":T.muted,transition:"all .2s"
          }}>Detailed</button>
        </div>
      </div>

      {/* Sections */}
      {sections.map((s,i) => (
        <div key={i} style={{marginBottom: i < sections.length-1 ? 20 : 0}}>
          {/* Section heading */}
          <div style={{
            fontSize:10,fontWeight:900,letterSpacing:1.5,
            color:s.labelColor,marginBottom:8,textTransform:"uppercase"
          }}>
            {s.labelClean}
          </div>
          {/* Section content */}
          {renderText(simple ? s.simpleText : s.detailText, s.isTargets)}
        </div>
      ))}
    </div>
  );
}
const BUILTIN_EXERCISES = [
  // CHEST
  {id:"bench-press",name:"Bench Press",bodyPart:"chest",equipment:"barbell",difficulty:"intermediate",
   desc:"🎯 Targets: Chest, shoulders, back of your arms | Pectorals, anterior deltoids, triceps\n📋 How to do it: Lie flat on bench. Grip bar slightly wider than shoulder-width. Lower bar to lower chest under control. Press back up to start.\n💡 Key tip: Keep shoulder blades pinched together and feet flat on the floor throughout. Don't bounce the bar off your chest."},
  {id:"incline-bench",name:"Incline Bench Press",bodyPart:"chest",equipment:"barbell",difficulty:"intermediate",
   desc:"🎯 Targets: Upper chest, front shoulders, back of your arms | Upper pectorals, anterior deltoids, triceps\n📋 How to do it: Set bench to 30–45°. Grip bar slightly wider than shoulder-width. Lower to upper chest, press back up.\n💡 Key tip: Keep the angle at 30° for more chest — higher angles shift load onto shoulders."},
  {id:"decline-bench",name:"Decline Bench Press",bodyPart:"chest",equipment:"barbell",difficulty:"intermediate",
   desc:"🎯 Targets: Lower chest, back of your arms, front shoulders | Lower pectorals, triceps, anterior deltoids\n📋 How to do it: Set bench to 15–30° decline. Grip bar slightly wider than shoulder-width. Lower to lower chest and press back up.\n💡 Key tip: Bar path sits lower than flat bench. Often easier on the shoulders for people with impingement."},
  {id:"db-press",name:"DB Flat Press",bodyPart:"chest",equipment:"dumbbell",difficulty:"beginner",
   desc:"🎯 Targets: Chest, front shoulders, back of your arms | Pectorals, anterior deltoids, triceps\n📋 How to do it: Lie flat with dumbbells at chest height. Lower until elbows are just below bench level. Press up and slightly together at the top.\n💡 Key tip: Each arm works independently — great for fixing imbalances. Allows a greater range of motion than the barbell version."},
  {id:"incline-db",name:"Incline DB Press",bodyPart:"chest",equipment:"dumbbell",difficulty:"beginner",
   desc:"🎯 Targets: Upper chest, front shoulders, back of your arms | Upper pectorals, anterior deltoids, triceps\n📋 How to do it: Set bench to 30–45°. Press dumbbells from shoulder height up and slightly together overhead.\n💡 Key tip: Control the descent — don't let the dumbbells drop fast. More range of motion than the barbell incline."},
  {id:"cable-fly",name:"Cable Fly",bodyPart:"chest",equipment:"cable",difficulty:"beginner",
   desc:"🎯 Targets: Chest, especially inner chest | Pectorals, especially the sternal head\n📋 How to do it: Set cables at chest height. Stand between them, step forward, and bring both hands together in a wide arc in front of your chest.\n💡 Key tip: Cables keep tension on the chest throughout — unlike dumbbells which lose it at the top. Think 'hugging a tree'."},
  {id:"pec-deck",name:"Pec Deck",bodyPart:"chest",equipment:"machine",difficulty:"beginner",
   desc:"🎯 Targets: Chest, especially inner chest | Pectorals, sternal head\n📋 How to do it: Sit upright in the machine. Place forearms on the pads. Squeeze your chest to bring the pads together, then slowly release.\n💡 Key tip: Great isolation exercise — no balance needed. Good as a finisher or for beginners learning the feel of chest contraction."},
  {id:"dips-chest",name:"Dips (Chest)",bodyPart:"chest",equipment:"bodyweight",difficulty:"intermediate",
   desc:"🎯 Targets: Lower chest, back of your arms, front shoulders | Lower pectorals, triceps, anterior deltoids\n📋 How to do it: Lean your torso forward 30–45° on the bars. Lower until you feel a stretch across your chest. Press back up.\n💡 Key tip: The forward lean is what shifts load to the chest. Add weight with a belt once bodyweight is easy."},
  {id:"pushups",name:"Push-ups",bodyPart:"chest",equipment:"bodyweight",difficulty:"beginner",
   desc:"🎯 Targets: Chest, front shoulders, back of your arms, core | Pectorals, anterior deltoids, triceps, transverse abdominis\n📋 How to do it: Hands slightly wider than shoulder-width, body in a straight line. Lower chest to the floor. Push back up.\n💡 Key tip: Progress by elevating your feet (more upper chest) or adding a weighted vest. Keep your core tight — don't let hips sag."},
  {id:"svend-press",name:"Svend Press",bodyPart:"chest",equipment:"plate",difficulty:"beginner",
   desc:"🎯 Targets: Inner chest | Sternal pectorals, pec minor\n📋 How to do it: Hold a weight plate between your palms at chest level. Press it forward while squeezing your hands together hard. Bring it back.\n💡 Key tip: Maintain constant inward pressure the entire time. The squeeze is the whole point — don't let the plate separate."},
  {id:"landmine-press",name:"Landmine Press",bodyPart:"chest",equipment:"barbell",difficulty:"intermediate",
   desc:"🎯 Targets: Upper chest, front shoulders, back of your arms | Upper pectorals, anterior deltoids, triceps\n📋 How to do it: Anchor a barbell in a corner or landmine. Press the end from chest height in a natural arc overhead.\n💡 Key tip: Can be done single-arm for added core work. The arc naturally targets the upper chest."},
  {id:"db-pullover",name:"DB Pullover",bodyPart:"chest",equipment:"dumbbell",difficulty:"beginner",
   desc:"🎯 Targets: Chest and sides of your back, under your arm | Pectorals, latissimus dorsi, serratus anterior\n📋 How to do it: Lie across a bench, upper back supported. Hold a dumbbell overhead with both hands. Lower it behind your head in an arc until you feel a stretch. Pull back.\n💡 Key tip: Works both chest and lats depending on how it's performed. Keep a slight bend in your elbows throughout."},
  // BACK
  {id:"deadlift",name:"Deadlift",bodyPart:"back",equipment:"barbell",difficulty:"advanced",
   desc:"🎯 Targets: Entire back of the body — lower back, glutes, hamstrings, upper back | Erector spinae, gluteus maximus, hamstrings, trapezius, rhomboids\n📋 How to do it: Bar over mid-foot, hip-width stance. Hinge and grip the bar. Brace core hard. Drive feet into the floor and pull bar up your shins. Lock out at the top by squeezing glutes.\n💡 Key tip: Do not round your lower back. Think 'push the floor away' rather than 'pull the bar up'. One of the most important lifts you can do."},
  {id:"barbell-row",name:"Barbell Row",bodyPart:"back",equipment:"barbell",difficulty:"intermediate",
   desc:"🎯 Targets: Back, rear shoulders, biceps | Latissimus dorsi, rhomboids, rear deltoids, biceps brachii\n📋 How to do it: Hinge forward until torso is roughly 45°. Pull bar into your lower sternum, driving elbows back. Squeeze lats at the top. Lower under control.\n💡 Key tip: Avoid jerking with your lower back to get the weight up. Control is everything here."},
  {id:"pullups",name:"Pull-ups",bodyPart:"back",equipment:"bodyweight",difficulty:"intermediate",
   desc:"🎯 Targets: Back width, biceps, rear shoulders | Latissimus dorsi, biceps brachii, rear deltoids, rhomboids\n📋 How to do it: Overhand grip, hands slightly wider than shoulder-width. Hang with arms straight. Pull up until chin clears the bar. Lower slowly.\n💡 Key tip: Drive your elbows down toward your hips — don't just pull with your arms. Add weight with a belt to progress."},
  {id:"chinups",name:"Chin-ups",bodyPart:"back",equipment:"bodyweight",difficulty:"intermediate",
   desc:"🎯 Targets: Back, biceps | Latissimus dorsi, biceps brachii, brachialis\n📋 How to do it: Underhand grip, hands shoulder-width. Hang with arms straight. Pull up until chin clears the bar. Lower slowly.\n💡 Key tip: The underhand grip recruits the biceps more, making it slightly easier than pull-ups. Great for lat width and arm size together."},
  {id:"lat-pulldown",name:"Lat Pulldown",bodyPart:"back",equipment:"cable",difficulty:"beginner",
   desc:"🎯 Targets: Back width, biceps | Latissimus dorsi, biceps brachii, teres major\n📋 How to do it: Grip bar wider than shoulder-width. Lean back slightly. Pull bar down to your upper chest, driving elbows toward your hips. Control the return.\n💡 Key tip: Feel the stretch in your lats at the top of each rep. This is the machine equivalent of a pull-up."},
  {id:"seated-row",name:"Seated Cable Row",bodyPart:"back",equipment:"cable",difficulty:"beginner",
   desc:"🎯 Targets: Mid-back thickness, rear shoulders, biceps | Rhomboids, middle trapezius, rear deltoids, biceps brachii\n📋 How to do it: Sit upright, feet on the platform. Pull the handle into your lower abdomen. Squeeze shoulder blades together at the end. Control the return.\n💡 Key tip: Keep torso relatively upright — avoid swinging back and forth. Builds back thickness."},
  {id:"tbar-row",name:"T-Bar Row",bodyPart:"back",equipment:"barbell",difficulty:"intermediate",
   desc:"🎯 Targets: Mid-back, back width, rear shoulders | Rhomboids, latissimus dorsi, rear deltoids, biceps brachii\n📋 How to do it: Straddle the bar, hinge forward, and row the bar into your chest. Keep your back flat throughout.\n💡 Key tip: Close grip hits mid-back more; wider grip hits lats more. One of the best back thickness movements available."},
  {id:"db-row",name:"Single Arm DB Row",bodyPart:"back",equipment:"dumbbell",difficulty:"beginner",
   desc:"🎯 Targets: Back, rear shoulders, biceps | Latissimus dorsi, rhomboids, rear deltoids, biceps brachii\n📋 How to do it: One knee and hand on a bench for support. Row dumbbell from a full hang up to your hip. Drive elbow up and back.\n💡 Key tip: Drive the elbow back — not just up. Allows a great range of motion and helps fix side-to-side imbalances."},
  {id:"rack-pull",name:"Rack Pull",bodyPart:"back",equipment:"barbell",difficulty:"intermediate",
   desc:"🎯 Targets: Upper back, traps, glutes, hamstrings | Trapezius, rhomboids, erector spinae, gluteus maximus, hamstrings\n📋 How to do it: Set bar at just below knee height on pins or safety bars. Deadlift from that position. Full lockout at the top.\n💡 Key tip: A partial deadlift — allows heavier loading than a full pull. Targets upper back and lockout strength specifically."},
  {id:"goodmorning",name:"Good Morning",bodyPart:"back",equipment:"barbell",difficulty:"intermediate",
   desc:"🎯 Targets: Lower back, hamstrings, glutes | Erector spinae, hamstrings, gluteus maximus\n📋 How to do it: Bar on your upper back. Hinge at the hips, pushing them back while torso drops forward. Keep back flat. Drive hips forward to return.\n💡 Key tip: Use light weight until the movement pattern is solid. Serious injury risk if loaded too heavy before the pattern is grooved."},
  {id:"back-extension",name:"Back Extension",bodyPart:"back",equipment:"machine",difficulty:"beginner",
   desc:"🎯 Targets: Lower back, glutes, hamstrings | Erector spinae, gluteus maximus, hamstrings\n📋 How to do it: Face-down on the bench, hips at the pad edge. Lower your upper body toward the floor. Raise back to parallel or just above.\n💡 Key tip: Don't hyperextend at the top — parallel to the floor is enough. Can add a plate to your chest for more resistance."},
  {id:"meadows-row",name:"Meadows Row",bodyPart:"back",equipment:"barbell",difficulty:"intermediate",
   desc:"🎯 Targets: Back — especially the lower-outer part, biceps | Latissimus dorsi (lower fibers), teres major, biceps brachii\n📋 How to do it: Stand perpendicular to a landmine barbell. Grab the end with a neutral grip. Row it toward your hip. Lower under control.\n💡 Key tip: Created by John Meadows. The angle gives a unique stretch and contraction through the lower lat. Excellent for back thickness."},
  // SHOULDERS
  {id:"ohp",name:"Overhead Press",bodyPart:"shoulders",equipment:"barbell",difficulty:"intermediate",
   desc:"🎯 Targets: Front and side shoulders, back of your arms, upper traps | Anterior and lateral deltoids, triceps, upper trapezius\n📋 How to do it: Bar at collarbone height. Grip just outside shoulder-width. Brace core. Press bar straight overhead. Shrug slightly at the top. Lower under control.\n💡 Key tip: Don't excessively arch your lower back. Think tall spine throughout. One of the best measures of upper body pressing strength."},
  {id:"db-ohp",name:"DB Shoulder Press",bodyPart:"shoulders",equipment:"dumbbell",difficulty:"beginner",
   desc:"🎯 Targets: Front and side shoulders, back of your arms | Anterior and lateral deltoids, triceps\n📋 How to do it: Seated or standing with dumbbells at shoulder height. Press them overhead, bringing slightly together at the top. Lower under control.\n💡 Key tip: Keep your core tight if standing. Greater range of motion than the barbell version."},
  {id:"arnold-press",name:"Arnold Press",bodyPart:"shoulders",equipment:"dumbbell",difficulty:"intermediate",
   desc:"🎯 Targets: All three parts of the shoulder — front, side, and rear | Anterior, lateral, and posterior deltoids\n📋 How to do it: Start with dumbbells in front of your face, palms facing you. As you press up, rotate your palms to face away. Reverse on the way down.\n💡 Key tip: Named after Arnold Schwarzenegger. The rotation trains all three delt heads through a larger range of motion than a standard press."},
  {id:"lateral-raises",name:"Lateral Raises",bodyPart:"shoulders",equipment:"dumbbell",difficulty:"beginner",
   desc:"🎯 Targets: Side of the shoulder — gives you width | Lateral deltoids\n📋 How to do it: Stand with dumbbells at your sides. Raise them out to the sides until shoulder height, slight bend in elbows. Lead with elbows. Lower slowly.\n💡 Key tip: The primary exercise for building shoulder width. Don't swing or shrug to get the weight up — control the movement."},
  {id:"front-raises",name:"Front Raises",bodyPart:"shoulders",equipment:"dumbbell",difficulty:"beginner",
   desc:"🎯 Targets: Front of the shoulder | Anterior deltoids\n📋 How to do it: Hold dumbbells in front of your thighs. Raise them straight forward to shoulder height. Lower slowly.\n💡 Key tip: Often overused — most pressing already hammers the front delt. Use sparingly if you press a lot."},
  {id:"face-pulls",name:"Face Pulls",bodyPart:"shoulders",equipment:"cable",difficulty:"beginner",
   desc:"🎯 Targets: Rear shoulder, upper back, rotator cuff | Posterior deltoids, external rotators, middle trapezius\n📋 How to do it: Set rope attachment at face height. Pull toward your face, driving elbows back and high. At end position, hands beside ears, elbows flared.\n💡 Key tip: Crucial for shoulder health and posture — especially if you press a lot. Do not skip this if you do a lot of benching."},
  {id:"upright-row",name:"Upright Row",bodyPart:"shoulders",equipment:"barbell",difficulty:"beginner",
   desc:"🎯 Targets: Side shoulders and upper traps | Lateral deltoids, upper trapezius\n📋 How to do it: Grip bar narrower than shoulder-width. Pull it straight up along your body to chin height, flaring elbows out. Lower slowly.\n💡 Key tip: Can cause shoulder impingement for some people. If you feel pinching, switch to a cable or wider dumbbell version."},
  {id:"cable-lateral",name:"Cable Lateral Raise",bodyPart:"shoulders",equipment:"cable",difficulty:"beginner",
   desc:"🎯 Targets: Side of the shoulder | Lateral deltoids\n📋 How to do it: Stand side-on to a low cable. Cross your body to grab the handle with the far hand. Raise to shoulder height. Lower slowly.\n💡 Key tip: The cable keeps tension on the side delt at the bottom of the movement where dumbbells lose it. More constant tension than dumbbells."},
  {id:"machine-press",name:"Machine Shoulder Press",bodyPart:"shoulders",equipment:"machine",difficulty:"beginner",
   desc:"🎯 Targets: Front and side shoulders, back of your arms | Anterior and lateral deltoids, triceps\n📋 How to do it: Sit in the machine with handles at shoulder height. Press overhead. Lower under control.\n💡 Key tip: Fixed path makes it easier to learn than free weights. Good for high-rep work or when stabiliser fatigue is limiting your free-weight pressing."},
  {id:"shrugs",name:"Barbell Shrugs",bodyPart:"shoulders",equipment:"barbell",difficulty:"beginner",
   desc:"🎯 Targets: Upper traps — the muscles between your neck and shoulders | Upper trapezius\n📋 How to do it: Hold a loaded barbell in front of your thighs. Shrug shoulders straight up toward ears. Hold briefly at the top. Lower slowly.\n💡 Key tip: Straight up and down only — don't roll your shoulders. This does nothing extra and risks injury."},
  // ARMS
  {id:"bb-curl",name:"Barbell Curl",bodyPart:"arms",equipment:"barbell",difficulty:"beginner",
   desc:"🎯 Targets: Biceps, upper arm | Biceps brachii, brachialis\n📋 How to do it: Stand holding bar with underhand grip at hip width. Curl from thighs to upper chest. Keep elbows pinned to sides. Lower under control.\n💡 Key tip: The foundational bicep mass builder. Use an EZ bar if you get wrist discomfort with the straight bar."},
  {id:"db-curl",name:"DB Curl",bodyPart:"arms",equipment:"dumbbell",difficulty:"beginner",
   desc:"🎯 Targets: Biceps | Biceps brachii, brachialis\n📋 How to do it: Stand or sit with dumbbells at your sides. Curl up. At the top, supinate your wrist (pinky turns out) to fully contract the bicep.\n💡 Key tip: Keep elbows at your sides throughout — don't let them swing forward to cheat the weight up."},
  {id:"hammer-curl",name:"Hammer Curl",bodyPart:"arms",equipment:"dumbbell",difficulty:"beginner",
   desc:"🎯 Targets: Upper arm thickness — biceps and the muscle underneath | Brachialis, brachioradialis, biceps brachii\n📋 How to do it: Hold dumbbells with a neutral grip (palms facing each other) throughout. Curl up like a standard DB curl. Lower slowly.\n💡 Key tip: The neutral grip hits the brachialis and brachioradialis harder — the muscles that give the arm a thick, full look from the side."},
  {id:"preacher-curl",name:"Preacher Curl",bodyPart:"arms",equipment:"machine",difficulty:"beginner",
   desc:"🎯 Targets: Biceps — especially the peak | Biceps brachii, brachialis\n📋 How to do it: Rest upper arms on the preacher bench pad. Curl from fully extended to fully contracted. Lower slowly — full stretch at the bottom.\n💡 Key tip: The pad locks your arms in place, eliminating cheating. Excellent for the bicep peak. Don't let the weight slam down at the bottom."},
  {id:"cable-curl",name:"Cable Curl",bodyPart:"arms",equipment:"cable",difficulty:"beginner",
   desc:"🎯 Targets: Biceps | Biceps brachii\n📋 How to do it: Low cable with bar or rope. Curl up to your face, elbows pinned. Lower under control.\n💡 Key tip: The cable maintains tension at the bottom where a dumbbell loses it. Good for high-rep finishing work."},
  {id:"incline-db-curl",name:"Incline DB Curl",bodyPart:"arms",equipment:"dumbbell",difficulty:"intermediate",
   desc:"🎯 Targets: Biceps — especially the lower portion for a fuller look | Biceps brachii long head\n📋 How to do it: Lie back on an incline bench (45–60°). Let dumbbells hang at your sides — arms behind your body. Curl up. Lower fully.\n💡 Key tip: The stretched starting position puts more load on the long head of the bicep. Excellent for building the lower bicep for a fuller look."},
  {id:"skull-crushers",name:"Skull Crushers",bodyPart:"arms",equipment:"barbell",difficulty:"intermediate",
   desc:"🎯 Targets: Back of the upper arm — triceps | Triceps brachii — primarily the long head\n📋 How to do it: Lie on a flat bench with EZ bar held over your face. Bend only at the elbows, lowering bar toward your forehead or just behind your head. Extend back to start.\n💡 Key tip: Keep your upper arms vertical and still throughout. Lower behind the head for more long-head stretch and better overall size gains."},
  {id:"tricep-pushdown",name:"Tricep Pushdown",bodyPart:"arms",equipment:"cable",difficulty:"beginner",
   desc:"🎯 Targets: Back of the upper arm — triceps | Triceps brachii — all three heads\n📋 How to do it: High cable with bar or rope. Start with elbows at 90°, upper arms pinned to sides. Push down until arms fully extended. Squeeze hard at the bottom.\n💡 Key tip: With the rope, flare your hands out at the bottom for a better contraction. Keep your upper arms locked — don't let elbows flare."},
  {id:"overhead-tri",name:"Overhead Tricep Extension",bodyPart:"arms",equipment:"cable",difficulty:"beginner",
   desc:"🎯 Targets: Back of the upper arm — especially the largest part | Triceps brachii long head\n📋 How to do it: Cable behind your head or hold a dumbbell. Elbows point at the ceiling, upper arms against your head. Extend arms overhead. Lower back behind head.\n💡 Key tip: The long head is only fully stretched when the arm is overhead. This is one of the most important tricep exercises for overall arm size."},
  {id:"close-grip",name:"Close Grip Bench",bodyPart:"arms",equipment:"barbell",difficulty:"intermediate",
   desc:"🎯 Targets: Back of the upper arm, chest, front shoulders | Triceps brachii, pectorals, anterior deltoids\n📋 How to do it: Flat bench press with a shoulder-width or slightly narrower grip. Keep elbows tucked at roughly 45°. Lower to chest, press back up.\n💡 Key tip: The best compound tricep movement for overloading with heavy weight. Don't go too narrow — it stresses the wrists."},
  {id:"dips-tri",name:"Tricep Dips",bodyPart:"arms",equipment:"bodyweight",difficulty:"intermediate",
   desc:"🎯 Targets: Back of the upper arm, front shoulders, chest | Triceps brachii, anterior deltoids, pectorals\n📋 How to do it: On parallel bars, keep torso upright. Lower by bending elbows, keeping them tucked to sides. Press back up.\n💡 Key tip: Upright torso = triceps. Forward lean = chest. Keep the torso tall if triceps are the target. Add weight with a dip belt to progress."},
  {id:"kickbacks",name:"Tricep Kickbacks",bodyPart:"arms",equipment:"dumbbell",difficulty:"beginner",
   desc:"🎯 Targets: Back of the upper arm when fully contracted | Triceps brachii — contracted position\n📋 How to do it: Hinge forward, one hand on bench. Upper arm parallel to floor, elbow bent. Extend dumbbell back until arm is straight. Squeeze hard. Lower.\n💡 Key tip: Only loads the tricep in the fully contracted position. Use a weight you can fully control — form breaks down quickly when too heavy."},
  // LEGS
  {id:"squat",name:"Squat",bodyPart:"legs",equipment:"barbell",difficulty:"advanced",
   desc:"🎯 Targets: Quads, glutes, hamstrings, lower back, core | Quadriceps, gluteus maximus, hamstrings, erector spinae, core stabilisers\n📋 How to do it: Bar on upper traps, feet shoulder-width, toes slightly out. Brace core hard. Push knees out over toes. Squat until thighs at least parallel. Drive back up through heels.\n💡 Key tip: Do not round your lower back. One of the most important lifts you can do. If depth is limited, work on ankle and hip mobility."},
  {id:"front-squat",name:"Front Squat",bodyPart:"legs",equipment:"barbell",difficulty:"advanced",
   desc:"🎯 Targets: Quads heavily, glutes, upper back, core | Quadriceps, gluteus maximus, upper trapezius, core stabilisers\n📋 How to do it: Bar rests on front shoulders (front rack). Keep torso upright. Squat to depth. Drive back up.\n💡 Key tip: Requires significant ankle mobility and shoulder flexibility. More quad-dominant than the back squat. Easier on the lower back."},
  {id:"hack-squat",name:"Hack Squat",bodyPart:"legs",equipment:"machine",difficulty:"intermediate",
   desc:"🎯 Targets: Quads, glutes, hamstrings | Quadriceps, gluteus maximus, hamstrings\n📋 How to do it: Shoulders on the pad, feet on the platform. Lower the sled until thighs are parallel or below. Drive back up.\n💡 Key tip: Higher and wider foot placement hits more glutes and hamstrings. Lower and narrower hits more quads. Less lower back stress than barbell squats."},
  {id:"leg-press",name:"Leg Press",bodyPart:"legs",equipment:"machine",difficulty:"beginner",
   desc:"🎯 Targets: Quads, glutes, hamstrings | Quadriceps, gluteus maximus, hamstrings\n📋 How to do it: Sit in machine. Feet on platform. Lower sled until knees are at 90°. Press back up without locking knees out.\n💡 Key tip: Don't let your lower back round off the pad at the bottom. High and wide feet = more glutes. Low and narrow = more quads."},
  {id:"rdl",name:"Romanian Deadlift",bodyPart:"legs",equipment:"barbell",difficulty:"intermediate",
   desc:"🎯 Targets: Hamstrings, glutes, lower back | Hamstrings, gluteus maximus, erector spinae\n📋 How to do it: Start standing with bar in hands. Hinge at hips, pushing them back. Bar slides down your thighs. Feel the hamstring stretch. Drive hips forward to return.\n💡 Key tip: The stretch at the bottom is what makes this effective. Don't bend the knees much. Keep your back flat throughout — this is not a squat."},
  {id:"leg-curl",name:"Leg Curl",bodyPart:"legs",equipment:"machine",difficulty:"beginner",
   desc:"🎯 Targets: Hamstrings | Hamstrings — biceps femoris, semimembranosus, semitendinosus\n📋 How to do it: Lying version: curl pad toward glutes. Seated version: curl against resistance. Full range of motion each rep.\n💡 Key tip: Lying trains hamstrings with hip extended (long head focus). Seated trains them with hip flexed (more stretch). Use both for complete hamstring development."},
  {id:"leg-ext",name:"Leg Extension",bodyPart:"legs",equipment:"machine",difficulty:"beginner",
   desc:"🎯 Targets: Quads in isolation | Quadriceps — rectus femoris, vastus lateralis, medialis, intermedius\n📋 How to do it: Sit upright, pad just above ankle. Extend legs until straight. Squeeze quads hard at the top. Lower slowly.\n💡 Key tip: Avoid extremely heavy weight — the knee joint is in a vulnerable position when fully extended. Best used as a finisher or warm-up."},
  {id:"lunges",name:"Walking Lunges",bodyPart:"legs",equipment:"dumbbell",difficulty:"beginner",
   desc:"🎯 Targets: Quads, glutes, hamstrings and your balance | Quadriceps, gluteus maximus, hamstrings, stabiliser muscles\n📋 How to do it: Step forward, lower rear knee toward the floor. Front knee tracks over toes. Push off front foot, bring rear foot forward into next step.\n💡 Key tip: Keep torso upright throughout. Can be done bodyweight, with dumbbells, or barbell on your back for more load."},
  {id:"bss",name:"Bulgarian Split Squat",bodyPart:"legs",equipment:"dumbbell",difficulty:"intermediate",
   desc:"🎯 Targets: Quads, glutes, front of the hip | Quadriceps, gluteus maximus, hip flexors\n📋 How to do it: Rear foot elevated on a bench. Front foot far enough forward to keep torso upright. Lower rear knee toward floor. Drive back up.\n💡 Key tip: One of the best single-leg exercises available. Start very light — it's harder than it looks. The rear hip flexor will feel it the next day."},
  {id:"calf-raises",name:"Calf Raises",bodyPart:"legs",equipment:"machine",difficulty:"beginner",
   desc:"🎯 Targets: Outer calf | Gastrocnemius\n📋 How to do it: Stand on the edge of a platform, heels able to drop below toes. Rise onto toes as high as possible. Hold briefly. Lower slowly below parallel.\n💡 Key tip: Calves are stubborn — they need high volume (15–20+ reps) and a full range of motion. The stretch at the bottom is critical."},
  {id:"seated-calf",name:"Seated Calf Raises",bodyPart:"legs",equipment:"machine",difficulty:"beginner",
   desc:"🎯 Targets: The deeper calf muscle that gives width | Soleus\n📋 How to do it: Sit with pad across lower thighs. Rise onto toes. Hold. Lower slowly.\n💡 Key tip: The soleus is only fully targeted when the knee is bent. It's the bigger underlying muscle — training it builds calf width. Use both standing and seated for complete development."},
  {id:"step-ups",name:"Step-ups",bodyPart:"legs",equipment:"dumbbell",difficulty:"beginner",
   desc:"🎯 Targets: Quads and glutes on the working leg | Quadriceps, gluteus maximus\n📋 How to do it: Stand in front of a bench or box. Step up with one foot. Drive through that heel to stand on the box. Step back down.\n💡 Key tip: Don't push off with the trailing foot — all the work should come from the working leg. Box height determines difficulty."},
  {id:"sumo-dl",name:"Sumo Deadlift",bodyPart:"legs",equipment:"barbell",difficulty:"intermediate",
   desc:"🎯 Targets: Inner thighs, glutes, hamstrings, lower back | Hip adductors, gluteus maximus, hamstrings, erector spinae\n📋 How to do it: Wide stance, toes turned out, hands inside knees. More upright torso than conventional. Drive hips forward to lock out.\n💡 Key tip: Shorter range of motion than conventional deadlift. Good option for people whose hip structure suits a wide stance or those managing lower back issues."},
  {id:"goblet-squat",name:"Goblet Squat",bodyPart:"legs",equipment:"dumbbell",difficulty:"beginner",
   desc:"🎯 Targets: Quads, glutes, core | Quadriceps, gluteus maximus, core stabilisers\n📋 How to do it: Hold a single dumbbell vertically at your chest. Squat down, keeping elbows inside your knees. Drive back up.\n💡 Key tip: The dumbbell in front acts as a counterbalance, helping you stay upright. Great for learning squat mechanics or as a warm-up."},
  // CORE
  {id:"plank",name:"Plank",bodyPart:"core",equipment:"bodyweight",difficulty:"beginner",
   desc:"🎯 Targets: Deep core, shoulders, glutes | Transverse abdominis, anterior deltoids, gluteus maximus\n📋 How to do it: Forearms on the floor, body in a straight line from head to heels. Hold without moving.\n💡 Key tip: Brace your abs like you're about to be punched and squeeze your glutes. Don't let hips sag or pike up. Quality over duration."},
  {id:"cable-crunch",name:"Cable Crunch",bodyPart:"core",equipment:"cable",difficulty:"beginner",
   desc:"🎯 Targets: Abs — six-pack muscles | Rectus abdominis\n📋 How to do it: Kneel at high cable with rope. Grip rope beside your head. Crunch elbows toward knees, rounding your spine. Return slowly.\n💡 Key tip: Use your abs to flex the spine — don't just pull with your arms. Allows progressive loading unlike most bodyweight core exercises."},
  {id:"hanging-lr",name:"Hanging Leg Raise",bodyPart:"core",equipment:"bodyweight",difficulty:"intermediate",
   desc:"🎯 Targets: Lower abs and hip flexors | Lower rectus abdominis, iliopsoas\n📋 How to do it: Hang from a pull-up bar. Raise legs (bent or straight) until at least parallel to the floor. Lower under control.\n💡 Key tip: Don't swing or use momentum. Start with bent knees and progress to straight legs. One of the best lower ab exercises."},
  {id:"dead-bug",name:"Dead Bug",bodyPart:"core",equipment:"bodyweight",difficulty:"beginner",
   desc:"🎯 Targets: Deep core stabilisers | Transverse abdominis, multifidus, diaphragm\n📋 How to do it: Lie on back, arms up, knees at 90° in the air. Lower right arm behind head and left leg toward floor simultaneously. Return. Repeat other side.\n💡 Key tip: Keep your lower back pressed firmly to the floor at all times. Excellent for lower back health and functional core stability."},
  {id:"ab-wheel",name:"Ab Wheel",bodyPart:"core",equipment:"other",difficulty:"intermediate",
   desc:"🎯 Targets: Entire core — especially anti-extension strength | Rectus abdominis, transverse abdominis, obliques, hip flexors\n📋 How to do it: Kneel, hold the wheel. Roll it forward until nearly parallel to the floor. Pull it back using your core. Don't let your hips sag.\n💡 Key tip: One of the most challenging core exercises. Start with partial reps until you can control the full range. Do not let your lower back arch."},
  {id:"russian-twist",name:"Russian Twist",bodyPart:"core",equipment:"plate",difficulty:"beginner",
   desc:"🎯 Targets: Side abs — obliques | External and internal obliques\n📋 How to do it: Sit with knees bent, feet elevated or on the floor, torso leaning back slightly. Rotate side to side, touching the weight to the floor each side.\n💡 Key tip: For more difficulty, elevate your feet and use a heavier plate. The rotation at the torso is what trains the obliques — don't just swing your arms."},
  {id:"pallof-press",name:"Pallof Press",bodyPart:"core",equipment:"cable",difficulty:"beginner",
   desc:"🎯 Targets: Anti-rotation core strength, side abs | Transverse abdominis, obliques, multifidus\n📋 How to do it: Stand side-on to a cable. Hands at chest height. Press cable straight out in front and hold, resisting the pull to rotate. Return to chest.\n💡 Key tip: The core is bracing isometrically against the cable trying to twist you. One of the most functional core exercises — trains how your core works in real life."},
  {id:"dragon-flag",name:"Dragon Flag",bodyPart:"core",equipment:"bodyweight",difficulty:"advanced",
   desc:"🎯 Targets: Entire core, especially lower abs | Rectus abdominis, hip flexors, transverse abdominis\n📋 How to do it: Lie on a bench, grip it behind your head. Raise your entire body as a rigid plank. Lower your body slowly toward horizontal, then raise back up.\n💡 Key tip: One of the most demanding bodyweight core exercises. Made famous by Bruce Lee. Master the eccentric (lowering) before attempting full reps."},
  {id:"side-plank",name:"Side Plank",bodyPart:"core",equipment:"bodyweight",difficulty:"beginner",
   desc:"🎯 Targets: Side abs and hip stability | Obliques, gluteus medius, quadratus lumborum\n📋 How to do it: Lie on side propped on one forearm. Stack your feet. Lift hips so your body forms a straight diagonal line. Hold.\n💡 Key tip: Don't let your hips drop or rotate forward. Progress by adding hip dips or raising your top leg for more difficulty."},
  {id:"v-ups",name:"V-Ups",bodyPart:"core",equipment:"bodyweight",difficulty:"beginner",
   desc:"🎯 Targets: Upper and lower abs | Rectus abdominis, hip flexors\n📋 How to do it: Lie flat, arms extended overhead. Simultaneously raise straight legs and upper body, reaching hands toward feet. Lower everything back under control.\n💡 Key tip: A dynamic full ab movement. Keep the movement controlled — don't just fling your legs up. Lower slowly for maximum tension."},
  // CARDIO
  {id:"treadmill",name:"Treadmill",bodyPart:"cardio",equipment:"machine",difficulty:"beginner",
   desc:"🎯 Targets: Heart and lungs, quads, glutes, calves | Cardiovascular system, quadriceps, gluteus maximus, gastrocnemius\n📋 How to do it: Walk, jog, or run at a chosen speed and incline. For conditioning, aim for a pace where you can hold a conversation (zone 2).\n💡 Key tip: Incline walking at 10–15° is a great low-impact alternative to running. For fat loss alongside lifting, 20–40 min at moderate intensity works well."},
  {id:"assault-bike",name:"Assault Bike",bodyPart:"cardio",equipment:"machine",difficulty:"intermediate",
   desc:"🎯 Targets: Heart and lungs — full body | Cardiovascular system, full body musculature\n📋 How to do it: Pedal and push/pull the handles simultaneously. Resistance automatically increases the harder you work.\n💡 Key tip: Extremely demanding — resistance is self-regulating. Common protocol: 10 seconds max effort, 50 seconds rest, repeat 10 times. Far harder than it looks."},
  {id:"rowing",name:"Rowing Machine",bodyPart:"cardio",equipment:"machine",difficulty:"beginner",
   desc:"🎯 Targets: Heart and lungs — legs, back, arms | Cardiovascular system, quadriceps, latissimus dorsi, biceps brachii\n📋 How to do it: The drive: push with legs first (60%), then lean back (20%), then pull arms to chest (20%). Recovery is the exact reverse.\n💡 Key tip: Common mistake is pulling with arms first. Damper setting 4–6 suits most people. Low-impact — good option if running aggravates your knees."},
  {id:"stairmaster",name:"StairMaster",bodyPart:"cardio",equipment:"machine",difficulty:"intermediate",
   desc:"🎯 Targets: Heart and lungs, glutes, quads | Cardiovascular system, gluteus maximus, quadriceps\n📋 How to do it: Step at a steady pace on the rotating stair machine. Keep your posture upright — don't lean heavily on the rails.\n💡 Key tip: Higher glute and quad activation than flat treadmill walking. Lower recovery impact than extra leg training sessions."},
  {id:"jump-rope",name:"Jump Rope",bodyPart:"cardio",equipment:"other",difficulty:"beginner",
   desc:"🎯 Targets: Heart and lungs, calves and coordination | Cardiovascular system, gastrocnemius, coordination\n📋 How to do it: Rotate rope with wrists (not arms). Land softly on the balls of your feet. Start with basic two-foot jumps before progressing.\n💡 Key tip: 10 minutes of continuous skipping ≈ a moderate jog. One of the most efficient conditioning tools per dollar. Can be done anywhere."},
  {id:"sled-push",name:"Sled Push",bodyPart:"cardio",equipment:"other",difficulty:"advanced",
   desc:"🎯 Targets: Quads, glutes and heart rate | Quadriceps, gluteus maximus, cardiovascular system\n📋 How to do it: Load the sled, grip the handles at hip height, drive with your legs at a forward lean. Keep pushing for the set distance.\n💡 Key tip: Minimal eccentric loading means very little muscle soreness — surprisingly good for recovery days. Load heavy for power, light for conditioning sprints."},
  {id:"farmers-carry",name:"Farmer's Carry",bodyPart:"cardio",equipment:"dumbbell",difficulty:"intermediate",
   desc:"🎯 Targets: Grip, traps, core stability and heart rate | Forearm flexors, trapezius, core stabilisers, cardiovascular system\n📋 How to do it: Pick up heavy dumbbells or kettlebells. Stand tall with shoulders pulled back. Walk for the set distance or time without putting them down.\n💡 Key tip: One of the most functional exercises that exists. Load as heavy as you can while maintaining tall posture and not waddling."},
  {id:"battle-ropes",name:"Battle Ropes",bodyPart:"cardio",equipment:"other",difficulty:"intermediate",
   desc:"🎯 Targets: Shoulders, arms and heart rate | Deltoids, biceps/triceps, cardiovascular system\n📋 How to do it: Anchor heavy ropes. Create waves, slams, or circles with alternating or simultaneous arm movements for set intervals.\n💡 Key tip: 20–30 second bursts at max effort with rest periods are effective. Trains shoulder endurance hard. Common in HIIT circuits."},
];

const EXERCISE_BODYPART = {};
BUILTIN_EXERCISES.forEach(ex => { EXERCISE_BODYPART[ex.name] = ex.bodyPart; });

const SESSION_TYPES = [
  {id:"push",label:"Push",icon:"💪",color:"#FF5F1F",
   defaultExercises:["Bench Press","Incline Bench Press","Overhead Press","Lateral Raises","Tricep Pushdown","Skull Crushers"]},
  {id:"pull",label:"Pull",icon:"🔙",color:"#FF8C42",
   defaultExercises:["Deadlift","Barbell Row","Pull-ups","Lat Pulldown","Face Pulls","Barbell Curl"]},
  {id:"legs",label:"Legs",icon:"🦵",color:"#34D399",
   defaultExercises:["Squat","Romanian Deadlift","Leg Press","Walking Lunges","Leg Curl","Calf Raises"]},
  {id:"upper",label:"Upper Body",icon:"🏋️",color:"#FF8C42",
   defaultExercises:["Bench Press","Barbell Row","Overhead Press","Pull-ups","Lateral Raises","Barbell Curl","Tricep Pushdown"]},
  {id:"lower",label:"Lower Body",icon:"⬇️",color:"#34D399",
   defaultExercises:["Squat","Romanian Deadlift","Leg Press","Leg Curl","Bulgarian Split Squat","Calf Raises"]},
  {id:"arms",label:"Arms",icon:"💪",color:"#A78BFA",
   defaultExercises:["Barbell Curl","Skull Crushers","Hammer Curl","Tricep Pushdown","Preacher Curl","Overhead Tricep Extension"]},
  {id:"core",label:"Core",icon:"🎯",color:"#22D3EE",
   defaultExercises:["Plank","Cable Crunch","Hanging Leg Raise","Dead Bug","Ab Wheel","Russian Twist"]},
  {id:"cardio",label:"Cardio",icon:"🏃",color:"#F472B6",
   defaultExercises:["Treadmill","Rowing Machine","Assault Bike","Jump Rope"]},
  {id:"stretch",label:"Stretch / Recovery",icon:"🧘",color:"#34D399",defaultExercises:[]},
  {id:"rest",label:"Rest",icon:"😴",color:"#666",defaultExercises:[]},
  {id:"custom",label:"Custom Session",icon:"✏️",color:"#FF5F1F",defaultExercises:[]},
];
const getType = id => SESSION_TYPES.find(t=>t.id===id)||SESSION_TYPES[SESSION_TYPES.length-1];

// Build exercises for a session type using library
const buildSessionExercises = (typeId, allExercises) => {
  const type = getType(typeId);
  if(!type.defaultExercises?.length) return [];
  return type.defaultExercises.map(name => {
    const lib = allExercises.find(e=>e.name===name);
    return {name, sets:4, reps:"8-12", bodyPart: lib?.bodyPart||EXERCISE_BODYPART[name]||"chest"};
  });
};

// ─── STORAGE ──────────────────────────────────────────────────────────────────
function useLS(key,def){
  const [v,sv]=useState(()=>{try{const s=localStorage.getItem(key);return s?JSON.parse(s):def;}catch{return def;}});
  const set=x=>{sv(x);try{localStorage.setItem(key,JSON.stringify(x));}catch{}};
  return [v,set];
}
async function storageGet(key,shared=false){try{const r=await window.storage.get(key,shared);return r?JSON.parse(r.value):null;}catch{return null;}}
async function storageSet(key,val,shared=false){try{await window.storage.set(key,JSON.stringify(val),shared);}catch{}}
async function storageList(prefix,shared=false){try{const r=await window.storage.list(prefix,shared);return r?.keys||[];}catch{return [];}}

// ─── SHARED COMPONENTS ───────────────────────────────────────────────────────
function Card({children,style={},onClick,glow=false}){
  const [hov,sh]=useState(false);
  return <div onClick={onClick} onMouseEnter={()=>sh(true)} onMouseLeave={()=>sh(false)}
    style={{background:hov&&onClick?T.cardHover:T.card,borderRadius:16,padding:18,
      boxShadow:glow?T.accentGlow:"none",border:`1px solid ${glow?"rgba(255,95,31,0.3)":T.border}`,
      cursor:onClick?"pointer":"default",transition:"all .2s",...style}}>{children}</div>;
}
function Btn({children,onClick,variant="primary",size="md",style={},disabled=false}){
  const [hov,sh]=useState(false);
  const vs={primary:{bg:hov?"#FF7A3F":T.accent,color:"#fff"},secondary:{bg:hov?T.cardHover:T.input,color:T.text},
    ghost:{bg:"transparent",color:hov?T.text:T.muted,border:`1px solid ${T.border}`},
    danger:{bg:hov?"#EF444430":"transparent",color:T.danger,border:`1px solid #EF444430`},
    success:{bg:hov?"#16A34A":"#22C55E",color:"#fff"}};
  const v=vs[variant]||vs.primary;
  const p=size==="lg"?"14px 0":size==="sm"?"7px 16px":"10px 22px";
  const fs=size==="lg"?15:size==="sm"?12:14;
  return <button onClick={disabled?undefined:onClick} disabled={disabled}
    onMouseEnter={()=>sh(true)} onMouseLeave={()=>sh(false)}
    style={{borderRadius:50,fontWeight:700,letterSpacing:.3,border:"none",padding:p,fontSize:fs,
      opacity:disabled?.35:1,transition:"all .2s",...(size==="lg"?{width:"100%",textAlign:"center"}:{}),
      ...v,...style}}>{children}</button>;
}
function Tag({children,color=T.accent}){
  return <span style={{background:`${color}22`,color,borderRadius:6,padding:"3px 9px",fontSize:11,fontWeight:700,letterSpacing:.5}}>{children}</span>;
}
function Pill({children,active,onClick,color=T.accent}){
  return <button onClick={onClick} style={{borderRadius:50,padding:"7px 16px",fontSize:12,fontWeight:700,
    border:"none",cursor:"pointer",background:active?color:T.input,color:active?"#fff":T.muted,
    letterSpacing:.3,transition:"all .2s"}}>{children}</button>;
}
function Spinner(){
  return <div className="spin" style={{width:20,height:20,border:"2px solid #333",borderTopColor:T.accent,borderRadius:"50%",display:"inline-block"}}/>;
}

// ─── PB MODAL ─────────────────────────────────────────────────────────────────
function PBModal({result,onClose}){
  if(!result)return null;
  return <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",
    justifyContent:"center",background:"rgba(0,0,0,0.88)",padding:24}} onClick={onClose}>
    <div className="pop-in" onClick={e=>e.stopPropagation()} style={{background:T.card,borderRadius:24,
      padding:32,textAlign:"center",border:`2px solid ${T.accent}`,boxShadow:T.accentGlow,maxWidth:320,width:"100%"}}>
      <div style={{fontSize:56,marginBottom:8}}>🏆</div>
      <div className="bc" style={{fontSize:13,letterSpacing:2,color:T.accent,marginBottom:6}}>NEW PERSONAL BEST</div>
      <div className="bc" style={{fontSize:32,fontWeight:900,lineHeight:1,marginBottom:8}}>{result.liftName}</div>
      <Tag color={result.bucket.color}>{result.bucket.label}</Tag>
      <div className="bc" style={{fontSize:52,fontWeight:900,color:T.accent,lineHeight:1,marginTop:12}}>{result.weight}kg</div>
      <div style={{fontSize:14,color:T.muted,marginBottom:4}}>× {result.reps} rep{result.reps>1?"s":""}</div>
      {result.newEst&&<div style={{background:T.input,borderRadius:10,padding:"10px 16px",margin:"12px 0"}}>
        <div style={{fontSize:11,color:T.muted,marginBottom:2}}>ESTIMATED 1RM</div>
        <div className="bc" style={{fontSize:28,fontWeight:900,color:T.success}}>{result.newEst}kg</div>
      </div>}
      <Btn size="lg" onClick={onClose} style={{marginTop:8}}>LET'S GO 🔥</Btn>
    </div>
  </div>;
}

// ─── NAV ──────────────────────────────────────────────────────────────────────
const TABS=[{id:"home",icon:"⚡",label:"Home"},{id:"plan",icon:"📋",label:"Plan"},
  {id:"pbs",icon:"🏆",label:"PBs"},{id:"board",icon:"👑",label:"Ranks"},
  {id:"coach",icon:"🤖",label:"Coach"},{id:"profile",icon:"👤",label:"Profile"}];

function Nav({tab,setTab}){
  return <nav style={{position:"fixed",bottom:0,left:0,right:0,zIndex:99,background:"#0A0A0A",
    borderTop:`1px solid ${T.border}`,display:"flex",justifyContent:"space-around",
    padding:"8px 0 max(8px,env(safe-area-inset-bottom))"}}>
    {TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{background:"none",border:"none",
      display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"2px 6px",cursor:"pointer",
      color:tab===t.id?T.accent:T.muted,fontFamily:"'Barlow',sans-serif",fontSize:9,fontWeight:700,
      letterSpacing:.5,transform:tab===t.id?"translateY(-2px)":"none",transition:"all .2s"}}>
      <span style={{fontSize:20}}>{t.icon}</span>{t.label}
    </button>)}
  </nav>;
}

// ─── EXERCISE PICKER ──────────────────────────────────────────────────────────
function ExercisePicker({allExercises, onSelect, onClose, filterBodyPart}){
  const [filter,setFilter]=useState(filterBodyPart||"all");
  const [search,setSearch]=useState("");
  const [showAddCustom,setShowAddCustom]=useState(false);
  const [newEx,setNewEx]=useState({name:"",bodyPart:"chest",equipment:"barbell",desc:""});
  const [genningDesc,setGenningDesc]=useState(false);

  const generateDesc=async()=>{
    if(!newEx.name.trim())return;
    setGenningDesc(true);
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:250,
          messages:[{role:"user",content:`Write a gym exercise description for "${newEx.name}" (${newEx.bodyPart}, ${newEx.equipment}) in EXACTLY this format, nothing else:\n\n🎯 Targets: [plain English muscles e.g. "chest, front shoulders, back of your arms"] | [technical names e.g. "pectorals, anterior deltoids, triceps"]\n📋 How to do it: [2-3 practical step-by-step cues in plain English]\n💡 Key tip: [one important thing to remember in plain English]\n\nThe Targets line must have BOTH a plain version and a technical version separated by " | ". Keep How to do it and Key tip in plain language only. No fluff.`}]})});
      const data=await res.json();
      const desc=data.content?.[0]?.text||"";
      setNewEx(prev=>({...prev,desc}));
    }catch{}finally{setGenningDesc(false);}
  };

  const filtered=allExercises.filter(ex=>{
    const matchPart=filter==="all"||ex.bodyPart===filter;
    const matchSearch=!search||ex.name.toLowerCase().includes(search.toLowerCase());
    return matchPart&&matchSearch;
  });

  const EQUIPMENT=["barbell","dumbbell","cable","machine","bodyweight","plate","other"];

  return <div style={{position:"fixed",inset:0,zIndex:150,background:"rgba(0,0,0,0.92)",display:"flex",flexDirection:"column"}}>
    <div style={{background:T.card,borderBottom:`1px solid ${T.border}`,padding:"16px 20px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div className="bc" style={{fontSize:20,fontWeight:900}}>EXERCISE LIBRARY</div>
        <button onClick={onClose} style={{background:"none",border:"none",color:T.muted,fontSize:20,cursor:"pointer"}}>✕</button>
      </div>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search exercises..." style={{marginBottom:10}}/>
      <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4}}>
        <Pill active={filter==="all"} onClick={()=>setFilter("all")}>All</Pill>
        {BODY_PARTS.map(bp=><Pill key={bp.id} active={filter===bp.id} onClick={()=>setFilter(bp.id)} color={bp.color}>{bp.label}</Pill>)}
      </div>
    </div>
    <div style={{flex:1,overflowY:"auto",padding:"12px 20px"}}>
      {showAddCustom?(
        <Card style={{marginBottom:16}}>
          <div style={{fontSize:11,color:T.accent,letterSpacing:1,marginBottom:12,fontWeight:700}}>ADD CUSTOM EXERCISE</div>
          <div style={{marginBottom:10}}>
            <div style={{fontSize:11,color:T.muted,marginBottom:6}}>NAME</div>
            <input value={newEx.name} onChange={e=>setNewEx({...newEx,name:e.target.value})} placeholder="e.g. Reverse Pec Deck"/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div>
              <div style={{fontSize:11,color:T.muted,marginBottom:6}}>BODY PART</div>
              <select value={newEx.bodyPart} onChange={e=>setNewEx({...newEx,bodyPart:e.target.value})}>
                {BODY_PARTS.map(bp=><option key={bp.id} value={bp.id}>{bp.label}</option>)}
              </select>
            </div>
            <div>
              <div style={{fontSize:11,color:T.muted,marginBottom:6}}>EQUIPMENT</div>
              <select value={newEx.equipment} onChange={e=>setNewEx({...newEx,equipment:e.target.value})}>
                {EQUIPMENT.map(eq=><option key={eq} value={eq}>{eq}</option>)}
              </select>
            </div>
          </div>
          <div style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <div style={{fontSize:11,color:T.muted}}>DESCRIPTION</div>
              <Btn size="sm" variant="ghost" onClick={generateDesc} disabled={!newEx.name.trim()||genningDesc}>
                {genningDesc?<span style={{display:"flex",alignItems:"center",gap:6}}><Spinner/>Writing...</span>:"⚡ AI Generate"}
              </Btn>
            </div>
            <textarea value={newEx.desc} onChange={e=>setNewEx({...newEx,desc:e.target.value})} placeholder={"🎯 Targets: muscles worked\n📋 How to do it: step by step\n💡 Key tip: one thing to remember\n\nOr hit AI Generate and it'll write it for you."} rows={4}/>
          </div>
          <div style={{display:"flex",gap:8}}>
            <Btn onClick={()=>{if(newEx.name.trim())onSelect({...newEx,custom:true});setShowAddCustom(false);setNewEx({name:"",bodyPart:"chest",equipment:"barbell",desc:""});}} disabled={!newEx.name.trim()||!newEx.desc.trim()}>Add & Use</Btn>
            <Btn variant="ghost" onClick={()=>setShowAddCustom(false)}>Cancel</Btn>
          </div>
          <div style={{fontSize:11,color:T.muted,marginTop:8}}>Description required. Custom exercises are shared with everyone.</div>
        </Card>
      ):(
        <button onClick={()=>setShowAddCustom(true)} style={{width:"100%",background:`${T.accent}15`,border:`1px dashed ${T.accent}`,borderRadius:12,padding:"12px",color:T.accent,fontSize:13,fontWeight:700,marginBottom:12,cursor:"pointer"}}>
          + Add Custom Exercise (shared with everyone)
        </button>
      )}
      {filtered.length===0&&<div style={{textAlign:"center",color:T.muted,padding:"30px 0",fontSize:14}}>No exercises found.</div>}
      {filtered.map((ex,i)=>{
        const bp=BODY_PARTS.find(b=>b.id===ex.bodyPart);
        const [expanded,setExpanded]=useState(false);
        return <div key={ex.id||i} style={{borderBottom:`1px solid ${T.border}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",cursor:"pointer"}}
            onClick={()=>onSelect(ex)}>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:14}}>{ex.name}</div>
              <div style={{display:"flex",gap:6,marginTop:4,flexWrap:"wrap"}}>
                {bp&&<Tag color={bp.color}>{bp.label}</Tag>}
                <Tag color={T.muted}>{ex.equipment}</Tag>
                {ex.custom&&<Tag color="#F472B6">Community</Tag>}
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0,marginLeft:10}}>
              {ex.desc&&<button onClick={e=>{e.stopPropagation();setExpanded(!expanded);}} style={{background:T.input,border:"none",color:T.muted,borderRadius:6,padding:"4px 8px",fontSize:11,cursor:"pointer",fontWeight:600}}>
                {expanded?"▲ LESS":"ℹ INFO"}
              </button>}
              <span style={{color:T.accent,fontSize:18}}>+</span>
            </div>
          </div>
          {expanded&&ex.desc&&<ExerciseDesc desc={ex.desc}/>}
        </div>;
      })}
    </div>
  </div>;
}

// ─── SESSION BUILDER ─────────────────────────────────────────────────────────
function SessionBuilder({day,week,existing,allExercises,onSave,onCancel}){
  const [typeId,setTypeId]=useState(existing?.typeId||"push");
  const [exercises,setExercises]=useState(existing?.customExercises||[]);
  const [showPicker,setShowPicker]=useState(false);
  const [mode,setMode]=useState(existing?"custom":"pick");

  const initFromType=(tid)=>{
    setTypeId(tid);
    const exs=buildSessionExercises(tid,allExercises);
    setExercises(exs);
    setMode("custom");
  };

  const updateEx=(i,field,val)=>{
    setExercises(exercises.map((e,idx)=>idx===i?{...e,[field]:val}:e));
  };
  const removeEx=(i)=>setExercises(exercises.filter((_,idx)=>idx!==i));
  const moveEx=(i,dir)=>{
    const arr=[...exercises];
    const j=i+dir;
    if(j<0||j>=arr.length)return;
    [arr[i],arr[j]]=[arr[j],arr[i]];
    setExercises(arr);
  };

  const save=()=>onSave({day,week,typeId,customExercises:exercises});

  if(mode==="pick") return <div className="fade-up">
    <button onClick={onCancel} style={{background:"none",border:"none",color:T.muted,fontSize:13,marginBottom:16,cursor:"pointer"}}>← BACK</button>
    <div style={{marginBottom:20}}>
      <div style={{fontSize:11,color:T.muted,letterSpacing:1}}>{day.toUpperCase()} — WEEK {week}</div>
      <h2 className="bc" style={{fontSize:32,fontWeight:900}}>PICK SESSION TYPE</h2>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {SESSION_TYPES.map(type=><Card key={type.id} onClick={()=>initFromType(type.id)} style={{padding:"16px 20px",cursor:"pointer"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <span style={{fontSize:28}}>{type.icon}</span>
            <div>
              <div style={{fontWeight:800,fontSize:16}}>{type.label}</div>
              {type.defaultExercises?.length>0&&<div style={{fontSize:12,color:T.muted,marginTop:2}}>
                {type.defaultExercises.slice(0,3).join(", ")}{type.defaultExercises.length>3?"...":""}
              </div>}
            </div>
          </div>
          <span style={{color:T.muted,fontSize:20}}>›</span>
        </div>
      </Card>)}
    </div>
  </div>;

  const type=getType(typeId);
  return <div className="fade-up">
    {showPicker&&<ExercisePicker allExercises={allExercises}
      onSelect={(ex)=>{
        setExercises([...exercises,{name:ex.name,sets:3,reps:"8-12",bodyPart:ex.bodyPart}]);
        setShowPicker(false);
      }}
      onClose={()=>setShowPicker(false)}/>}
    <button onClick={()=>setMode("pick")} style={{background:"none",border:"none",color:T.muted,fontSize:13,marginBottom:16,cursor:"pointer"}}>← CHANGE TYPE</button>
    <div style={{marginBottom:16}}>
      <div style={{fontSize:11,color:T.muted,letterSpacing:1}}>{day.toUpperCase()} — WEEK {week}</div>
      <h2 className="bc" style={{fontSize:32,fontWeight:900}}>{type.icon} {type.label.toUpperCase()}</h2>
    </div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
      <div style={{fontSize:13,color:T.muted}}>{exercises.length} exercises</div>
      <Btn size="sm" onClick={()=>setShowPicker(true)}>+ Add Exercise</Btn>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
      {exercises.map((ex,i)=>{
        const bp=BODY_PARTS.find(b=>b.id===ex.bodyPart);
        const libEx=allExercises.find(e=>e.name===ex.name);
        const [showDesc,setShowDesc]=useState(false);
        return <Card key={i} style={{padding:"12px 16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
            <div style={{fontWeight:700,fontSize:14,flex:1}}>{ex.name}</div>
            <div style={{display:"flex",gap:6,flexShrink:0,marginLeft:8}}>
              {libEx?.desc&&<button onClick={()=>setShowDesc(!showDesc)} style={{background:T.input,border:"none",color:T.muted,borderRadius:6,padding:"4px 8px",cursor:"pointer",fontSize:10,fontWeight:600}}>{showDesc?"▲":"ℹ"}</button>}
              <button onClick={()=>moveEx(i,-1)} style={{background:T.input,border:"none",color:T.muted,borderRadius:6,padding:"4px 8px",cursor:"pointer",fontSize:12}}>↑</button>
              <button onClick={()=>moveEx(i,1)} style={{background:T.input,border:"none",color:T.muted,borderRadius:6,padding:"4px 8px",cursor:"pointer",fontSize:12}}>↓</button>
              <button onClick={()=>removeEx(i)} style={{background:"none",border:"none",color:T.danger,cursor:"pointer",fontSize:16}}>✕</button>
            </div>
          </div>
          {showDesc&&libEx?.desc&&<ExerciseDesc desc={libEx.desc}/>}
          {bp&&<Tag color={bp.color} style={{marginBottom:8}}>{bp.label}</Tag>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8}}>
            <div>
              <div style={{fontSize:10,color:T.muted,marginBottom:4}}>SETS</div>
              <input type="number" value={ex.sets} onChange={e=>updateEx(i,"sets",parseInt(e.target.value)||1)} placeholder="4"/>
            </div>
            <div>
              <div style={{fontSize:10,color:T.muted,marginBottom:4}}>REPS / TIME</div>
              <input value={ex.reps} onChange={e=>updateEx(i,"reps",e.target.value)} placeholder="e.g. 8-12"/>
            </div>
          </div>
        </Card>;
      })}
      {exercises.length===0&&<div style={{textAlign:"center",color:T.muted,padding:"30px 0",fontSize:14}}>
        No exercises yet — add from the library above.
      </div>}
    </div>
    <Btn size="lg" onClick={save} disabled={exercises.length===0||typeId==="rest"?false:exercises.length===0}>SAVE SESSION</Btn>
    {(typeId==="rest"||typeId==="stretch")&&exercises.length===0&&<Btn size="lg" onClick={save} style={{marginTop:8}} variant="ghost">Save as {type.label}</Btn>}
  </div>;
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
function Home({profile,checkins,setCheckins,plan,pbs,setPbs,setPbResult,allExercises}){
  const [weight,setWeight]=useState("");
  const [energy,setEnergy]=useState(3);
  const [notes,setNotes]=useState("");
  const [saved,setSaved]=useState(false);
  const [openSession,setOpenSession]=useState(false);

  const dayIdx=new Date().getDay();
  const dayName=DAYS[dayIdx===0?6:dayIdx-1];
  const todaySession=plan.find(s=>s.day===dayName&&s.week===1);
  const sessionType=todaySession?getType(todaySession.typeId):null;
  const sessionExercises=todaySession?.customExercises||buildSessionExercises(todaySession?.typeId,allExercises);
  const latest=checkins[checkins.length-1];

  const logCheckin=()=>{
    if(!weight)return;
    setCheckins([...checkins,{date:today(),weight:parseFloat(weight),energy,notes}]);
    setWeight("");setNotes("");setSaved(true);setTimeout(()=>setSaved(false),2000);
  };

  const logTopSet=(exName,w,r,bodyPart)=>{
    const bp=bodyPart||EXERCISE_BODYPART[exName]||"chest";
    const bucket=getBucket(r);
    const existing=pbs[exName]||{};
    const bucketEntries=existing[bucket.id]||[];
    const curBest=bucketEntries.length?Math.max(...bucketEntries.map(e=>e.weight)):null;
    const isPB=curBest===null||w>curBest;
    const entry={date:today(),weight:w,reps:r,bodyPart:bp};
    setPbs({...pbs,[exName]:{...existing,[bucket.id]:[...bucketEntries,entry]}});
    if(isPB)setPbResult({liftName:exName,weight:w,reps:r,bucket,newEst:r>1?e1RM(w,r):null});
  };

  if(openSession&&sessionType&&sessionExercises.length>0){
    return <SessionView type={sessionType} exercises={sessionExercises} pbs={pbs} onLogSet={logTopSet} onClose={()=>setOpenSession(false)} profile={profile} allExercises={allExercises}/>;
  }

  return <div className="fade-up">
    <div style={{marginBottom:24}}>
      <div style={{fontSize:12,color:T.muted,letterSpacing:1,marginBottom:4}}>GOOD {new Date().getHours()<12?"MORNING":"AFTERNOON"}</div>
      <h1 className="bc" style={{fontSize:44,fontWeight:900,lineHeight:1,letterSpacing:-1}}>
        {profile.name||"ATHLETE"}<br/><span style={{color:T.accent}}>DASHBOARD</span>
      </h1>
    </div>
    <div style={{marginBottom:20}}>
      <div style={{fontSize:11,color:T.muted,letterSpacing:1,marginBottom:10}}>TODAY — {dayName.toUpperCase()}</div>
      {sessionType?(
        <Card glow={sessionType.id!=="rest"&&sessionType.id!=="stretch"} style={{padding:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
            <div>
              <div style={{fontSize:28,marginBottom:4}}>{sessionType.icon}</div>
              <div className="bc" style={{fontSize:28,fontWeight:900}}>{sessionType.label.toUpperCase()}</div>
              <div style={{fontSize:12,color:T.muted,marginTop:2}}>{sessionExercises.length} exercises</div>
            </div>
            <Tag color={sessionType.color}>SCHEDULED</Tag>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
            {sessionExercises.slice(0,4).map((ex,i)=><span key={i} style={{background:T.input,borderRadius:6,padding:"4px 10px",fontSize:11,color:T.muted}}>{ex.name}</span>)}
            {sessionExercises.length>4&&<span style={{color:T.muted,fontSize:11,alignSelf:"center"}}>+{sessionExercises.length-4} more</span>}
          </div>
          {sessionExercises.length>0&&<Btn onClick={()=>setOpenSession(true)} size="lg">OPEN SESSION 💪</Btn>}
        </Card>
      ):(
        <Card><div style={{color:T.muted,textAlign:"center",padding:"16px 0",fontSize:14}}>No session planned — set up your week in Plan.</div></Card>
      )}
    </div>
    <div style={{marginBottom:20}}>
      <div style={{fontSize:11,color:T.muted,letterSpacing:1,marginBottom:10}}>WEEKLY CHECK-IN</div>
      <Card>
        <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:12,marginBottom:12,alignItems:"end"}}>
          <div>
            <div style={{fontSize:11,color:T.muted,marginBottom:6}}>WEIGHT (KG)</div>
            <input type="number" value={weight} onChange={e=>setWeight(e.target.value)} placeholder={latest?`Last: ${latest.weight}kg`:"e.g. 85.0"}/>
          </div>
          <div>
            <div style={{fontSize:11,color:T.muted,marginBottom:6,textAlign:"center"}}>ENERGY</div>
            <div style={{display:"flex",gap:5}}>
              {[1,2,3,4,5].map(n=><button key={n} onClick={()=>setEnergy(n)} style={{width:32,height:32,borderRadius:50,border:"none",cursor:"pointer",background:energy>=n?T.accent:T.input,color:energy>=n?"#fff":T.muted,fontSize:12,fontWeight:700}}>{n}</button>)}
            </div>
          </div>
        </div>
        <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Notes — how's the body feeling?" rows={2} style={{marginBottom:12}}/>
        <Btn size="lg" onClick={logCheckin} disabled={!weight}>{saved?"✓ LOGGED":"LOG CHECK-IN"}</Btn>
      </Card>
    </div>
    {checkins.length>0&&<div>
      <div style={{fontSize:11,color:T.muted,letterSpacing:1,marginBottom:10}}>RECENT</div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {[...checkins].reverse().slice(0,3).map((c,i)=><Card key={i} style={{padding:"12px 16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:13,color:T.muted}}>{fmtDate(c.date)}</div>
              {c.notes&&<div style={{fontSize:13,marginTop:2}}>{c.notes}</div>}
            </div>
            <div style={{textAlign:"right"}}>
              <div className="bc" style={{fontSize:22,fontWeight:900,color:T.accent}}>{c.weight}kg</div>
              <div style={{fontSize:11,color:T.muted}}>Energy {c.energy}/5</div>
            </div>
          </div>
        </Card>)}
      </div>
    </div>}
  </div>;
}

// ─── SESSION VIEW ─────────────────────────────────────────────────────────────
function SessionView({type,exercises,pbs,onLogSet,onClose,profile,allExercises}){
  const [topSets,setTopSets]=useState({});
  const [logged,setLogged]=useState({});

  const handleLog=(ex)=>{
    const ts=topSets[ex.name]||{};
    const w=parseFloat(ts.weight);const r=parseInt(ts.reps);
    if(!w||!r||r<1)return;
    onLogSet(ex.name,w,r,ex.bodyPart);
    setLogged({...logged,[ex.name]:true});
  };

  const getGuidance=(ex,goals)=>{
    const isStrength=(goals||[]).some(g=>g.toLowerCase().includes("strength"));
    const isSize=(goals||[]).some(g=>g.toLowerCase().includes("size"));
    const isWeak=(profile.weakPoints||[]).map(w=>w.toLowerCase()).includes((ex.bodyPart||"").toLowerCase());
    if(isWeak)return "Priority muscle — push for progressive overload";
    if(isStrength&&!isSize)return "Strength focus — lower reps, max effort final set";
    if(isSize&&!isStrength)return "Hypertrophy focus — controlled tempo, chase the burn";
    return "Strength + size — hit the target, push the last set";
  };

  return <div className="fade-up">
    <button onClick={onClose} style={{background:"none",border:"none",color:T.muted,fontSize:13,marginBottom:16,cursor:"pointer"}}>← BACK</button>
    <div style={{marginBottom:16}}>
      <div style={{fontSize:11,color:T.muted,letterSpacing:1}}>{new Date().toLocaleDateString("en-AU",{weekday:"long"}).toUpperCase()}</div>
      <h2 className="bc" style={{fontSize:34,fontWeight:900}}>{type.icon} {type.label.toUpperCase()}</h2>
      <div style={{fontSize:13,color:T.muted,marginTop:4}}>Log your top set. Auto-detects PBs.</div>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {exercises.map((ex,i)=>{
        const myBest=getBestE1RM(pbs[ex.name]);
        const ts=topSets[ex.name]||{weight:"",reps:""};
        const done=logged[ex.name];
        const bp=BODY_PARTS.find(b=>b.id===ex.bodyPart);
        const libEx=allExercises?.find(e=>e.name===ex.name);
        const [showDesc,setShowDesc]=useState(false);
        return <Card key={i} style={{border:`1px solid ${done?"rgba(34,197,94,0.3)":T.border}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
            <div style={{flex:1}}>
              <div style={{fontWeight:800,fontSize:15}}>{ex.name}</div>
              <div style={{display:"flex",gap:6,marginTop:4,flexWrap:"wrap",alignItems:"center"}}>
                <Tag color={T.accent}>{ex.sets} × {ex.reps}</Tag>
                {bp&&<Tag color={bp.color}>{bp.label}</Tag>}
                {libEx?.desc&&<button onClick={()=>setShowDesc(!showDesc)} style={{background:T.input,border:"none",color:T.muted,borderRadius:6,padding:"3px 8px",fontSize:10,cursor:"pointer",fontWeight:600}}>{showDesc?"▲":"ℹ"}</button>}
              </div>
            </div>
            {done&&<span style={{color:T.success,fontSize:22}}>✓</span>}
          </div>
          {showDesc&&libEx?.desc&&<ExerciseDesc desc={libEx.desc}/>}
          {myBest&&<div style={{background:T.input,borderRadius:8,padding:"7px 12px",marginBottom:8,fontSize:12}}>
            <span style={{color:T.muted}}>Your best: </span>
            <span style={{color:T.accent,fontWeight:700}}>{myBest.weight}kg × {myBest.reps}</span>
            <span style={{color:T.muted}}> · e1RM {myBest.est}kg</span>
          </div>}
          <div style={{fontSize:11,color:T.muted,marginBottom:8,fontStyle:"italic"}}>{getGuidance(ex,profile.goals)}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:8,alignItems:"end"}}>
            <div>
              <div style={{fontSize:10,color:T.muted,marginBottom:4}}>TOP SET (KG)</div>
              <input type="number" value={ts.weight} onChange={e=>setTopSets({...topSets,[ex.name]:{...ts,weight:e.target.value}})} placeholder="e.g. 100"/>
            </div>
            <div>
              <div style={{fontSize:10,color:T.muted,marginBottom:4}}>REPS</div>
              <input type="number" value={ts.reps} onChange={e=>setTopSets({...topSets,[ex.name]:{...ts,reps:e.target.value}})} placeholder="e.g. 6"/>
            </div>
            <Btn size="sm" onClick={()=>handleLog(ex)} disabled={done||!ts.weight||!ts.reps} variant={done?"ghost":"primary"}>{done?"✓":"LOG"}</Btn>
          </div>
          {ts.weight&&ts.reps&&parseInt(ts.reps)>0&&<div style={{marginTop:8,fontSize:11,color:T.muted}}>
            <Tag color={getBucket(parseInt(ts.reps)).color}>{getBucket(parseInt(ts.reps)).label}</Tag>
            <span style={{marginLeft:8}}>e1RM: <span style={{color:T.text,fontWeight:700}}>{e1RM(parseFloat(ts.weight),parseInt(ts.reps))}kg</span></span>
          </div>}
        </Card>;
      })}
    </div>
    <div style={{marginTop:20}}><Btn variant="ghost" size="lg" onClick={onClose}>DONE FOR TODAY</Btn></div>
  </div>;
}

// ─── PLAN ─────────────────────────────────────────────────────────────────────
function Plan({plan,setPlan,allExercises,setAllExercises,profile}){
  const [week,setWeek]=useState(1);
  const [building,setBuilding]=useState(null); // {day, week}
  const [generating,setGenerating]=useState(false);
  const [genMsg,setGenMsg]=useState("");

  const getSession=(day,w)=>plan.find(s=>s.day===day&&s.week===w);

  const saveSession=(session)=>{
    const updated=plan.filter(s=>!(s.day===session.day&&s.week===session.week));
    setPlan([...updated,session]);
    setBuilding(null);
    // Save any new custom exercises to shared library
    if(session.customExercises){
      session.customExercises.forEach(ex=>{
        if(!allExercises.find(e=>e.name===ex.name)){
          const newEx={id:`custom-${Date.now()}`,name:ex.name,bodyPart:ex.bodyPart,equipment:"other",custom:true};
          const updated=[...allExercises,newEx];
          setAllExercises(updated);
          EXERCISE_BODYPART[ex.name]=ex.bodyPart;
          storageSet("shared-exercises",updated.filter(e=>e.custom),true);
        }
      });
    }
  };

  const generateWithAI=async()=>{
    setGenerating(true);
    setGenMsg("Reading your profile...");
    const prompt=`You are a strength and hypertrophy coach. Build a 2-week rotating gym program for this athlete.

PROFILE:
Name: ${profile.name||"Athlete"}
Age: ${profile.age||"unknown"}
Weight: ${profile.weight||"unknown"}kg
Goals: ${(profile.goals||[]).join(", ")||"Build strength and size"}
Priority/Weak points: ${(profile.weakPoints||[]).join(", ")||"Legs"}
Training frequency: 5-6x/week
Experience: ${profile.experience||"Intermediate"}
Occupation: ${profile.occupation||"Unknown"} — Physical demand: ${profile.physicalDemand||"Unknown"}
Work hours: ${profile.workHours||"Unknown"}
Injuries/limitations: ${profile.injuries||"None"}

AVAILABLE SESSION TYPES: push, pull, legs, upper, lower, arms, core, cardio, stretch, rest

Respond ONLY with valid JSON in this exact format, nothing else:
{
  "week1": {
    "Mon": "push",
    "Tue": "legs",
    "Wed": "pull",
    "Thu": "rest",
    "Fri": "upper",
    "Sat": "arms",
    "Sun": "rest"
  },
  "week2": {
    "Mon": "legs",
    "Tue": "push",
    "Wed": "lower",
    "Thu": "pull",
    "Fri": "arms",
    "Sat": "core",
    "Sun": "rest"
  },
  "reasoning": "Brief explanation of why this split suits their profile"
}

Use session type IDs exactly as listed. Prioritise their weak points. Consider physical job recovery needs.`;

    try{
      setGenMsg("Building your program...");
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,
          messages:[{role:"user",content:prompt}]})});
      const data=await res.json();
      const raw=data.content?.[0]?.text||"";
      const clean=raw.replace(/```json|```/g,"").trim();
      const parsed=JSON.parse(clean);
      const newPlan=[];
      ["week1","week2"].forEach((wk,wi)=>{
        DAYS.forEach(day=>{
          const typeId=parsed[wk]?.[day];
          if(typeId){
            const exs=buildSessionExercises(typeId,allExercises);
            newPlan.push({day,week:wi+1,typeId,customExercises:exs});
          }
        });
      });
      setPlan(newPlan);
      setGenMsg(parsed.reasoning||"Plan generated!");
      setTimeout(()=>setGenMsg(""),5000);
    }catch(err){
      setGenMsg("Couldn't generate — check your profile is filled in and try again.");
      setTimeout(()=>setGenMsg(""),4000);
    }finally{setGenerating(false);}
  };

  if(building) return <SessionBuilder day={building.day} week={building.week}
    existing={getSession(building.day,building.week)}
    allExercises={allExercises}
    onSave={saveSession}
    onCancel={()=>setBuilding(null)}/>;

  return <div className="fade-up">
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
      <h1 className="bc" style={{fontSize:40,fontWeight:900,lineHeight:1,letterSpacing:-1}}>WEEKLY<br/><span style={{color:T.accent}}>PLAN</span></h1>
      <div style={{display:"flex",gap:8,marginTop:6}}>
        <Pill active={week===1} onClick={()=>setWeek(1)}>WK 1</Pill>
        <Pill active={week===2} onClick={()=>setWeek(2)}>WK 2</Pill>
      </div>
    </div>

    <Card style={{marginBottom:16,background:`${T.accent}10`,border:`1px solid ${T.accent}30`}}>
      <div style={{fontSize:13,fontWeight:600,marginBottom:8}}>🤖 Build with AI</div>
      <div style={{fontSize:12,color:T.muted,marginBottom:12}}>Fill in your Profile first — the more detail, the better the program. AI will read your goals, job, experience, and injuries.</div>
      <Btn onClick={generateWithAI} disabled={generating} style={{marginBottom:genMsg?8:0}}>
        {generating?<span style={{display:"flex",alignItems:"center",gap:8,justifyContent:"center"}}><Spinner/> Generating...</span>:"⚡ Generate My Plan with AI"}
      </Btn>
      {genMsg&&<div style={{fontSize:12,color:generating?T.muted:T.success,marginTop:8,lineHeight:1.5}}>{genMsg}</div>}
    </Card>

    <div style={{fontSize:12,color:T.muted,marginBottom:12}}>Or tap a day to manually build/edit.</div>
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {DAYS.map(day=>{
        const s=getSession(day,week);
        const type=s?getType(s.typeId):null;
        const exCount=s?.customExercises?.length||buildSessionExercises(s?.typeId,allExercises).length||0;
        const isToday=DAYS[new Date().getDay()===0?6:new Date().getDay()-1]===day;
        return <Card key={day} onClick={()=>setBuilding({day,week})} style={{padding:"14px 18px",cursor:"pointer",border:`1px solid ${isToday?T.accent:T.border}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              {type&&<span style={{fontSize:20}}>{type.icon}</span>}
              <div>
                <div style={{fontSize:11,color:isToday?T.accent:T.muted,letterSpacing:1,fontWeight:700}}>{day.toUpperCase()}{isToday?" · TODAY":""}</div>
                <div style={{fontSize:14,fontWeight:700,marginTop:2,color:type?T.text:T.muted}}>{type?.label||"Tap to build"}</div>
                {type&&exCount>0&&<div style={{fontSize:11,color:T.muted,marginTop:1}}>{exCount} exercises</div>}
              </div>
            </div>
            {type&&<Tag color={type.color}>{exCount>0?`${exCount} ex`:type.label}</Tag>}
          </div>
        </Card>;
      })}
    </div>
  </div>;
}

// ─── PBs ──────────────────────────────────────────────────────────────────────
function PBs({pbs,setPbs,setPbResult,allExercises}){
  const [liftName,setLiftName]=useState("");
  const [customLift,setCustomLift]=useState("");
  const [customBP,setCustomBP]=useState("chest");
  const [weight,setWeight]=useState("");
  const [reps,setReps]=useState("");
  const [selectedLift,setSelectedLift]=useState(null);
  const [showPicker,setShowPicker]=useState(false);

  const log=()=>{
    const name=liftName==="__custom"?customLift:liftName;
    const w=parseFloat(weight);const r=parseInt(reps);
    if(!name||!w||!r||r<1)return;
    const bp=liftName==="__custom"?customBP:(EXERCISE_BODYPART[name]||allExercises.find(e=>e.name===name)?.bodyPart||"chest");
    const bucket=getBucket(r);
    const existing=pbs[name]||{};
    const bucketEntries=existing[bucket.id]||[];
    const curBest=bucketEntries.length?Math.max(...bucketEntries.map(e=>e.weight)):null;
    const isPB=curBest===null||w>curBest;
    setPbs({...pbs,[name]:{...existing,[bucket.id]:[...bucketEntries,{date:today(),weight:w,reps:r,bodyPart:bp}]}});
    if(isPB)setPbResult({liftName:name,weight:w,reps:r,bucket,newEst:r>1?e1RM(w,r):null});
    setWeight("");setReps("");
  };

  const tracked=Object.keys(pbs).filter(k=>Object.values(pbs[k]).some(a=>a.length>0));

  if(showPicker) return <ExercisePicker allExercises={allExercises}
    onSelect={ex=>{setLiftName(ex.name);EXERCISE_BODYPART[ex.name]=ex.bodyPart;setShowPicker(false);}}
    onClose={()=>setShowPicker(false)}/>;

  if(selectedLift&&pbs[selectedLift]){
    const liftData=pbs[selectedLift];
    const overallBest=getBestE1RM(liftData);
    const bp=BODY_PARTS.find(b=>b.id===(EXERCISE_BODYPART[selectedLift]||allExercises.find(e=>e.name===selectedLift)?.bodyPart));
    return <div className="fade-up">
      <button onClick={()=>setSelectedLift(null)} style={{background:"none",border:"none",color:T.muted,fontSize:13,marginBottom:16,cursor:"pointer"}}>← BACK</button>
      <div style={{marginBottom:4}}>{bp&&<Tag color={bp.color}>{bp.label}</Tag>}</div>
      <h2 className="bc" style={{fontSize:32,fontWeight:900,marginTop:6,letterSpacing:-0.5}}>{selectedLift.toUpperCase()}</h2>
      {overallBest&&<Card glow style={{padding:"16px 20px",marginBottom:20,marginTop:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:11,color:T.muted,letterSpacing:1,marginBottom:4}}>BEST ESTIMATED 1RM</div>
            <div className="bc" style={{fontSize:42,fontWeight:900,color:T.accent,lineHeight:1}}>{overallBest.est}kg</div>
            <div style={{fontSize:12,color:T.muted,marginTop:4}}>{overallBest.weight}kg × {overallBest.reps} · {fmtDate(overallBest.date)}</div>
          </div>
          <div style={{fontSize:36}}>🏆</div>
        </div>
      </Card>}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {BUCKETS.map(bucket=>{
          const best=getBucketBest(liftData,bucket.id);
          const entries=(liftData[bucket.id]||[]).sort((a,b)=>new Date(b.date)-new Date(a.date));
          return <Card key={bucket.id} style={{opacity:best?1:.4}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:best?10:0}}>
              <div><Tag color={bucket.color}>{bucket.label}</Tag>
                {best?<div style={{display:"flex",alignItems:"baseline",gap:8,marginTop:8}}>
                  <div className="bc" style={{fontSize:30,fontWeight:900,color:bucket.color,lineHeight:1}}>{best.weight}kg</div>
                  <div style={{fontSize:13,color:T.muted}}>× {best.reps} · e1RM: {e1RM(best.weight,best.reps)}kg</div>
                </div>:<div style={{fontSize:13,color:T.muted,marginTop:6}}>No entries yet</div>}
              </div>
              {best&&<div style={{fontSize:11,color:T.muted}}>{entries.length} entries</div>}
            </div>
            {entries.length>1&&<div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:2}}>
              {entries.slice(0,6).map((e,i)=><div key={i} style={{background:T.input,borderRadius:8,padding:"6px 10px",flexShrink:0,textAlign:"center",minWidth:62}}>
                <div style={{fontSize:13,fontWeight:800,color:i===0?bucket.color:T.text}}>{e.weight}kg</div>
                <div style={{fontSize:10,color:T.muted}}>×{e.reps}</div>
                <div style={{fontSize:10,color:T.muted}}>{fmtDate(e.date)}</div>
              </div>)}
            </div>}
          </Card>;
        })}
      </div>
    </div>;
  }

  return <div className="fade-up">
    <h1 className="bc" style={{fontSize:40,fontWeight:900,lineHeight:1,letterSpacing:-1,marginBottom:20}}>PERSONAL<br/><span style={{color:T.accent}}>BESTS</span></h1>
    <Card style={{marginBottom:20}}>
      <div style={{fontSize:11,color:T.muted,letterSpacing:1,marginBottom:12}}>LOG A SET</div>
      <div style={{marginBottom:10,display:"flex",gap:8}}>
        <div style={{flex:1,background:T.input,borderRadius:10,padding:"10px 14px",fontSize:14,color:liftName?T.text:T.muted,cursor:"pointer",border:`1px solid ${T.border}`}}
          onClick={()=>setShowPicker(true)}>{liftName||"Select exercise from library..."}</div>
        {liftName&&<button onClick={()=>setLiftName("")} style={{background:"none",border:"none",color:T.muted,cursor:"pointer",fontSize:18}}>✕</button>}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:8}}>
        <div><div style={{fontSize:11,color:T.muted,marginBottom:6}}>WEIGHT (KG)</div><input type="number" value={weight} onChange={e=>setWeight(e.target.value)} placeholder="e.g. 140"/></div>
        <div><div style={{fontSize:11,color:T.muted,marginBottom:6}}>REPS</div><input type="number" value={reps} onChange={e=>setReps(e.target.value)} placeholder="e.g. 5"/></div>
      </div>
      {reps&&parseInt(reps)>0&&<div style={{marginBottom:12,display:"flex",gap:8,alignItems:"center"}}>
        <Tag color={getBucket(parseInt(reps)).color}>{getBucket(parseInt(reps)).label}</Tag>
        {weight&&<span style={{fontSize:12,color:T.muted}}>e1RM: <span style={{color:T.text,fontWeight:700}}>{e1RM(parseFloat(weight),parseInt(reps))}kg</span></span>}
      </div>}
      <Btn size="lg" onClick={log} disabled={!liftName||!weight||!reps}>LOG SET</Btn>
    </Card>
    {tracked.length>0&&<>
      <div style={{fontSize:11,color:T.muted,letterSpacing:1,marginBottom:12}}>YOUR LIFTS</div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {tracked.map(name=>{
          const liftData=pbs[name];
          const overallBest=getBestE1RM(liftData);
          const bucketBests=BUCKETS.map(b=>({bucket:b,best:getBucketBest(liftData,b.id)})).filter(x=>x.best);
          const bp=BODY_PARTS.find(b=>b.id===(EXERCISE_BODYPART[name]||allExercises.find(e=>e.name===name)?.bodyPart));
          return <Card key={name} onClick={()=>setSelectedLift(name)} style={{cursor:"pointer"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div>
                {bp&&<Tag color={bp.color}>{bp.label}</Tag>}
                <div style={{fontWeight:800,fontSize:16,marginTop:4}}>{name}</div>
                {overallBest&&<div style={{fontSize:12,color:T.muted,marginTop:2}}>Best e1RM: <span style={{color:T.accent,fontWeight:700}}>{overallBest.est}kg</span></div>}
              </div>
              <span style={{color:T.muted,fontSize:20}}>›</span>
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {bucketBests.map(({bucket,best})=><div key={bucket.id} style={{background:T.input,borderRadius:8,padding:"5px 10px",textAlign:"center",minWidth:60}}>
                <div style={{fontSize:10,color:bucket.color,fontWeight:700,marginBottom:1}}>{bucket.label}</div>
                <div style={{fontSize:13,fontWeight:800}}>{best.weight}kg</div>
                <div style={{fontSize:10,color:T.muted}}>×{best.reps}</div>
              </div>)}
            </div>
          </Card>;
        })}
      </div>
    </>}
  </div>;
}

// ─── LEADERBOARD ─────────────────────────────────────────────────────────────
function Leaderboard({username,pbs}){
  const [allUsers,setAllUsers]=useState([]);
  const [loading,setLoading]=useState(true);
  const [activeTab,setActiveTab]=useState("gym");

  useEffect(()=>{
    if(!username)return;
    storageSet(`user:${username}`,{username,pbs,updatedAt:today()},true);
  },[username,pbs]);

  useEffect(()=>{
    const load=async()=>{
      setLoading(true);
      const keys=await storageList("user:",true);
      const users=await Promise.all(keys.map(k=>storageGet(k,true)));
      setAllUsers(users.filter(Boolean));
      setLoading(false);
    };
    load();
    const iv=setInterval(load,30000);
    return ()=>clearInterval(iv);
  },[]);

  const getBodyPartScore=(userPbs,bpId)=>{
    let best=0;
    Object.entries(userPbs||{}).forEach(([exName,liftData])=>{
      const bp=EXERCISE_BODYPART[exName]||Object.values(liftData).flat()[0]?.bodyPart;
      if(bp===bpId){const b=getBestE1RM(liftData);if(b&&b.est>best)best=b.est;}
    });
    return best;
  };
  const getOverallScore=(userPbs)=>BODY_PARTS.reduce((s,bp)=>s+getBodyPartScore(userPbs,bp.id),0);
  const getMostImproved=(userPbs,days)=>{
    const cutoff=new Date();cutoff.setDate(cutoff.getDate()-days);
    let best=0;
    Object.values(userPbs||{}).forEach(liftData=>{
      BUCKETS.forEach(bucket=>{
        const entries=(liftData[bucket.id]||[]).sort((a,b)=>new Date(a.date)-new Date(b.date));
        const before=entries.filter(e=>new Date(e.date)<cutoff);
        const after=entries.filter(e=>new Date(e.date)>=cutoff);
        if(before.length&&after.length){
          const g=((Math.max(...after.map(e=>e.weight))-Math.max(...before.map(e=>e.weight)))/Math.max(...before.map(e=>e.weight)))*100;
          if(g>best)best=g;
        }
      });
    });
    return best;
  };

  const Crown=({rank})=>{
    if(rank===0)return <span style={{fontSize:20}}>👑</span>;
    if(rank===1)return <span style={{fontSize:16}}>🥈</span>;
    if(rank===2)return <span style={{fontSize:16}}>🥉</span>;
    return <span style={{fontSize:13,color:T.muted,fontWeight:700}}>#{rank+1}</span>;
  };

  const Board=({title,color,rows,unit=""})=><Card style={{marginBottom:12}}>
    <div style={{fontSize:11,color:color||T.accent,letterSpacing:1,fontWeight:700,marginBottom:12}}>{title}</div>
    {rows.length===0&&<div style={{color:T.muted,fontSize:13,textAlign:"center",padding:"10px 0"}}>No data yet</div>}
    {rows.map((row,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
      padding:"10px 0",borderBottom:i<rows.length-1?`1px solid ${T.border}`:"none"}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <Crown rank={i}/>
        <div>
          <div style={{fontWeight:700,fontSize:14,color:i===0?T.accent:T.text}}>{row.username}</div>
          {row.sub&&<div style={{fontSize:11,color:T.muted,marginTop:1}}>{row.sub}</div>}
        </div>
      </div>
      <div className="bc" style={{fontSize:20,fontWeight:900,color:i===0?T.accent:T.text}}>
        {row.score>0?`${Math.round(row.score*10)/10}${unit}`:"—"}
      </div>
    </div>)}
  </Card>;

  if(!username)return <div className="fade-up" style={{textAlign:"center",padding:"60px 20px"}}>
    <div style={{fontSize:40,marginBottom:12}}>👑</div>
    <div className="bc" style={{fontSize:24,fontWeight:900,marginBottom:8}}>SET YOUR USERNAME</div>
    <div style={{fontSize:14,color:T.muted}}>Set your name in Profile to join the leaderboard.</div>
  </div>;

  if(loading)return <div style={{textAlign:"center",padding:"60px 20px",color:T.muted}}>Loading ranks...</div>;

  const gymRows=[...allUsers].map(u=>({username:u.username,score:getOverallScore(u.pbs)})).sort((a,b)=>b.score-a.score);
  const imp7=[...allUsers].map(u=>({username:u.username,score:getMostImproved(u.pbs,7),sub:"Best % gain — 7 days"})).sort((a,b)=>b.score-a.score);
  const imp14=[...allUsers].map(u=>({username:u.username,score:getMostImproved(u.pbs,14),sub:"Best % gain — 14 days"})).sort((a,b)=>b.score-a.score);

  return <div className="fade-up">
    <h1 className="bc" style={{fontSize:40,fontWeight:900,lineHeight:1,letterSpacing:-1,marginBottom:4}}>THE<br/><span style={{color:T.accent}}>RANKINGS</span></h1>
    <div style={{fontSize:12,color:T.muted,marginBottom:16}}>{allUsers.length} athlete{allUsers.length!==1?"s":""} on the board</div>
    <div style={{display:"flex",gap:8,marginBottom:20,overflowX:"auto",paddingBottom:4}}>
      {[{id:"gym",label:"GYM"},{id:"bodypart",label:"BODY PARTS"},{id:"improved",label:"IMPROVED"}].map(t=>
        <Pill key={t.id} active={activeTab===t.id} onClick={()=>setActiveTab(t.id)}>{t.label}</Pill>)}
    </div>
    {activeTab==="gym"&&<Board title="👑 KING OF THE GYM" color={T.accent} rows={gymRows} unit="kg"/>}
    {activeTab==="bodypart"&&BODY_PARTS.map(bp=>{
      const rows=[...allUsers].map(u=>({username:u.username,score:getBodyPartScore(u.pbs,bp.id)})).sort((a,b)=>b.score-a.score);
      return <Board key={bp.id} title={`${bp.icon} KING OF ${bp.label.toUpperCase()}`} color={bp.color} rows={rows} unit="kg"/>;
    })}
    {activeTab==="improved"&&<>
      <Board title="🚀 MOST IMPROVED — 7 DAYS" color={T.success} rows={imp7} unit="%"/>
      <Board title="📈 MOST IMPROVED — 14 DAYS" color="#60A5FA" rows={imp14} unit="%"/>
    </>}
  </div>;
}

// ─── AI COACH ─────────────────────────────────────────────────────────────────
function Coach({profile,checkins,pbs,plan,allExercises}){
  const [msgs,setMsgs]=useState([{role:"assistant",content:"What are we working on? I've got your full profile — program, PBs, check-ins, goals, job, everything. Ask me anything."}]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const bottomRef=useRef(null);
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[msgs,loading]);

  const buildSystem=()=>{
    const latest=checkins[checkins.length-1];
    const pbLines=Object.entries(pbs).map(([name,liftData])=>{
      const best=getBestE1RM(liftData);
      const bs=BUCKETS.map(b=>{const bst=getBucketBest(liftData,b.id);return bst?`${b.label}:${bst.weight}kg×${bst.reps}`:null;}).filter(Boolean).join(", ");
      return `  ${name}: e1RM ${best?.est||"?"}kg | ${bs}`;
    }).join("\n")||"  None logged yet";
    const planLines=plan.filter(s=>s.week===1).map(s=>`  ${s.day}: ${getType(s.typeId).label}`).join("\n")||"  Not set up yet";
    return `No-fluff strength and hypertrophy coach. Direct, evidence-based. No disclaimers.

ATHLETE: ${profile.name||"Athlete"} | ${profile.age||"?"}yo | ${latest?.weight||profile.weight||"?"}kg | ${profile.experience||"Intermediate"}
GOALS: ${(profile.goals||[]).join(", ")||"Strength and size"}
PRIORITY: ${(profile.weakPoints||[]).join(", ")||"Legs"}
JOB: ${profile.occupation||"Unknown"} — ${profile.physicalDemand||"?"} physical demand — ${profile.workHours||"?"} hours
INJURIES: ${profile.injuries||"None"}
FREQUENCY: 5-6x/week | Wake:${profile.wakeTime||"06:00"} Sleep:${profile.sleepTime||"22:00"}

PLAN WK1: ${planLines}
PBs: ${pbLines}
WEIGHT: ${checkins.slice(-4).map(c=>`${fmtDate(c.date)}:${c.weight}kg`).join(", ")||"No data"}`;
  };

  const send=async()=>{
    if(!input.trim()||loading)return;
    const userMsg={role:"user",content:input};
    const next=[...msgs,userMsg];
    setMsgs(next);setInput("");setLoading(true);
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:buildSystem(),messages:next.map(m=>({role:m.role,content:m.content}))})});
      const data=await res.json();
      setMsgs([...next,{role:"assistant",content:data.content?.[0]?.text||"Error."}]);
    }catch{setMsgs([...next,{role:"assistant",content:"Couldn't reach the API."}]);}
    finally{setLoading(false);}
  };

  return <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 130px)"}}>
    <div style={{flexShrink:0,marginBottom:14}}>
      <h1 className="bc" style={{fontSize:40,fontWeight:900,lineHeight:1,letterSpacing:-1}}>AI<br/><span style={{color:T.accent}}>COACH</span></h1>
      <div style={{fontSize:12,color:T.muted,marginTop:4}}>Full profile context · Powered by Claude</div>
    </div>
    {msgs.length<=1&&<div style={{flexShrink:0,display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
      {["Plan my next 12 weeks for size and strength","My legs are lagging — fix my program","How much protein do I actually need?","What should I change given my physical job?"].map((s,i)=>
        <button key={i} onClick={()=>setInput(s)} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 14px",color:T.text,textAlign:"left",fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:"'Barlow',sans-serif",transition:"border-color .2s"}}
          onMouseEnter={e=>e.currentTarget.style.borderColor=T.accent}
          onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>{s}</button>)}
    </div>}
    <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:10,paddingBottom:8}}>
      {msgs.map((m,i)=><div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
        <div style={{maxWidth:"86%",borderRadius:m.role==="user"?"18px 18px 4px 18px":"18px 18px 18px 4px",
          padding:"12px 16px",fontSize:14,lineHeight:1.65,background:m.role==="user"?T.accent:T.card,
          color:T.text,whiteSpace:"pre-wrap",fontWeight:m.role==="user"?600:400}}>{m.content}</div>
      </div>)}
      {loading&&<div style={{display:"flex",justifyContent:"flex-start"}}>
        <div style={{background:T.card,borderRadius:"18px 18px 18px 4px",padding:"14px 20px"}}>
          <span style={{color:T.muted,letterSpacing:6,animation:"pulse 1.2s infinite ease-in-out"}}>···</span>
        </div>
      </div>}
      <div ref={bottomRef}/>
    </div>
    <div style={{flexShrink:0,paddingTop:10,display:"flex",gap:8}}>
      <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()} placeholder="Ask your coach..." style={{flex:1}}/>
      <Btn onClick={send} disabled={loading||!input.trim()} style={{flexShrink:0}}>{loading?"…":"SEND"}</Btn>
    </div>
  </div>;
}

// ─── PROFILE + DICTATION ──────────────────────────────────────────────────────
function Profile({profile,setProfile}){
  const [local,setLocal]=useState({...profile});
  const [saved,setSaved]=useState(false);
  const [newGoal,setNewGoal]=useState("");
  const [recording,setRecording]=useState(false);
  const [transcript,setTranscript]=useState("");
  const [interpreting,setInterpreting]=useState(false);
  const [dictationResult,setDictationResult]=useState("");
  const recognitionRef=useRef(null);

  const save=()=>{setProfile(local);setSaved(true);setTimeout(()=>setSaved(false),2000);};
  const addGoal=()=>{if(!newGoal.trim())return;setLocal({...local,goals:[...(local.goals||[]),newGoal.trim()]});setNewGoal("");};
  const removeGoal=i=>setLocal({...local,goals:(local.goals||[]).filter((_,idx)=>idx!==i)});
  const toggleWeak=g=>{const c=local.weakPoints||[];setLocal({...local,weakPoints:c.includes(g)?c.filter(x=>x!==g):[...c,g]});};
  const MG=["Chest","Back","Shoulders","Arms","Legs","Core"];
  const DEMAND=["Desk/office","Light physical","Moderate physical (trades)","Heavy physical (labour)","Mixed"];
  const EXP=["Beginner","Intermediate","Advanced"];

  const startRecording=()=>{
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){alert("Speech recognition not supported in this browser. Try Chrome or Safari on iOS.");return;}
    const r=new SR();
    r.continuous=true;r.interimResults=true;r.lang="en-AU";
    r.onresult=e=>{
      let t="";
      for(let i=0;i<e.results.length;i++) t+=e.results[i][0].transcript;
      setTranscript(t);
    };
    r.onend=()=>setRecording(false);
    r.start();
    recognitionRef.current=r;
    setRecording(true);setTranscript("");
  };

  const stopRecording=()=>{
    recognitionRef.current?.stop();
    setRecording(false);
  };

  const interpretWithAI=async()=>{
    if(!transcript.trim())return;
    setInterpreting(true);setDictationResult("");
    const prompt=`Extract structured profile information from this spoken description. Return ONLY valid JSON, no markdown, no explanation:

"${transcript}"

Return this exact JSON structure (use null for anything not mentioned):
{
  "name": null,
  "age": null,
  "weight": null,
  "occupation": null,
  "physicalDemand": null,
  "workHours": null,
  "experience": null,
  "injuries": null,
  "goals": [],
  "weakPoints": [],
  "wakeTime": null,
  "sleepTime": null,
  "gymTime": null
}

physicalDemand must be one of: "Desk/office", "Light physical", "Moderate physical (trades)", "Heavy physical (labour)", "Mixed"
experience must be one of: "Beginner", "Intermediate", "Advanced"
goals should be a list of specific training goals extracted from speech
weakPoints should be muscle group names: Chest, Back, Shoulders, Arms, Legs, Core`;

    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:600,messages:[{role:"user",content:prompt}]})});
      const data=await res.json();
      const raw=data.content?.[0]?.text||"{}";
      const parsed=JSON.parse(raw.replace(/```json|```/g,"").trim());
      // Merge non-null values into local profile
      const merged={...local};
      Object.entries(parsed).forEach(([k,v])=>{
        if(v!==null&&v!==undefined){
          if(Array.isArray(v)&&v.length>0) merged[k]=v;
          else if(!Array.isArray(v)&&v!=="") merged[k]=v;
        }
      });
      setLocal(merged);
      setDictationResult("✓ Profile updated from your description — review below and save.");
    }catch{
      setDictationResult("Couldn't interpret — try again or fill in manually.");
    }finally{setInterpreting(false);}
  };

  return <div className="fade-up">
    <h1 className="bc" style={{fontSize:40,fontWeight:900,lineHeight:1,letterSpacing:-1,marginBottom:20}}>YOUR<br/><span style={{color:T.accent}}>PROFILE</span></h1>

    {/* DICTATION */}
    <Card style={{marginBottom:16,border:`1px solid ${recording?"rgba(255,95,31,0.5)":T.border}`}}>
      <div style={{fontSize:11,color:T.accent,letterSpacing:1,fontWeight:700,marginBottom:8}}>🎤 DICTATION</div>
      <div style={{fontSize:12,color:T.muted,marginBottom:12}}>Tap Record and describe yourself — job, goals, injuries, training background. AI will fill in your profile.</div>
      <div style={{display:"flex",gap:8,marginBottom:transcript?12:0}}>
        {!recording?(
          <Btn onClick={startRecording} style={{flex:1}}>🎤 Start Recording</Btn>
        ):(
          <Btn onClick={stopRecording} variant="danger" style={{flex:1,animation:"pulse 1s infinite"}}>⏹ Stop Recording</Btn>
        )}
        {transcript&&!recording&&<Btn onClick={interpretWithAI} disabled={interpreting} variant="success" style={{flex:1}}>
          {interpreting?<span style={{display:"flex",alignItems:"center",gap:6,justifyContent:"center"}}><Spinner/>Reading...</span>:"⚡ Fill Profile"}
        </Btn>}
      </div>
      {transcript&&<div style={{background:T.input,borderRadius:10,padding:"10px 14px",fontSize:13,color:T.text,lineHeight:1.6,marginBottom:dictationResult?8:0}}>
        <div style={{fontSize:10,color:T.muted,marginBottom:4}}>TRANSCRIPT</div>
        {transcript}
      </div>}
      {!transcript&&<textarea value={transcript} onChange={e=>setTranscript(e.target.value)} placeholder="Or type your description here if mic doesn't work..." rows={3}/>}
      {dictationResult&&<div style={{fontSize:12,color:T.success,marginTop:4,fontWeight:600}}>{dictationResult}</div>}
    </Card>

    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <Card>
        <div style={{fontSize:11,color:T.muted,letterSpacing:1,marginBottom:12}}>BASICS</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          <div><div style={{fontSize:11,color:T.muted,marginBottom:6}}>NAME / USERNAME</div>
            <input value={local.name||""} onChange={e=>setLocal({...local,name:e.target.value})} placeholder="Your name"/></div>
          <div><div style={{fontSize:11,color:T.muted,marginBottom:6}}>AGE</div>
            <input type="number" value={local.age||""} onChange={e=>setLocal({...local,age:parseInt(e.target.value)})} placeholder="e.g. 28"/></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div><div style={{fontSize:11,color:T.muted,marginBottom:6}}>BODYWEIGHT (KG)</div>
            <input type="number" value={local.weight||""} onChange={e=>setLocal({...local,weight:parseFloat(e.target.value)})} placeholder="e.g. 84"/></div>
          <div><div style={{fontSize:11,color:T.muted,marginBottom:6}}>EXPERIENCE</div>
            <select value={local.experience||"Intermediate"} onChange={e=>setLocal({...local,experience:e.target.value})}>
              {EXP.map(e=><option key={e}>{e}</option>)}
            </select></div>
        </div>
        <div style={{fontSize:11,color:T.muted,marginTop:10}}>Name = your leaderboard username. Make it unique.</div>
      </Card>

      <Card>
        <div style={{fontSize:11,color:T.muted,letterSpacing:1,marginBottom:12}}>OCCUPATION</div>
        <div style={{marginBottom:10}}>
          <div style={{fontSize:11,color:T.muted,marginBottom:6}}>JOB / ROLE</div>
          <input value={local.occupation||""} onChange={e=>setLocal({...local,occupation:e.target.value})} placeholder="e.g. Electrician"/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div><div style={{fontSize:11,color:T.muted,marginBottom:6}}>PHYSICAL DEMAND</div>
            <select value={local.physicalDemand||""} onChange={e=>setLocal({...local,physicalDemand:e.target.value})}>
              <option value="">Select...</option>
              {DEMAND.map(d=><option key={d}>{d}</option>)}
            </select></div>
          <div><div style={{fontSize:11,color:T.muted,marginBottom:6}}>WORK HOURS</div>
            <input value={local.workHours||""} onChange={e=>setLocal({...local,workHours:e.target.value})} placeholder="e.g. 7am–4pm"/></div>
        </div>
      </Card>

      <Card>
        <div style={{fontSize:11,color:T.muted,letterSpacing:1,marginBottom:12}}>SCHEDULE</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          <div><div style={{fontSize:11,color:T.muted,marginBottom:6}}>WAKE UP</div><input type="time" value={local.wakeTime||"06:00"} onChange={e=>setLocal({...local,wakeTime:e.target.value})}/></div>
          <div><div style={{fontSize:11,color:T.muted,marginBottom:6}}>SLEEP</div><input type="time" value={local.sleepTime||"22:00"} onChange={e=>setLocal({...local,sleepTime:e.target.value})}/></div>
        </div>
        <div><div style={{fontSize:11,color:T.muted,marginBottom:6}}>GYM TIME</div><input type="time" value={local.gymTime||"07:00"} onChange={e=>setLocal({...local,gymTime:e.target.value})}/></div>
      </Card>

      <Card>
        <div style={{fontSize:11,color:T.muted,letterSpacing:1,marginBottom:12}}>INJURIES / LIMITATIONS</div>
        <textarea value={local.injuries||""} onChange={e=>setLocal({...local,injuries:e.target.value})} placeholder="e.g. Left shoulder impingement, avoid overhead pressing heavy. Lower back gets sore on high deadlift volume." rows={3}/>
      </Card>

      <Card>
        <div style={{fontSize:11,color:T.muted,letterSpacing:1,marginBottom:12}}>GOALS</div>
        <div style={{display:"flex",gap:8,marginBottom:10}}>
          <input value={newGoal} onChange={e=>setNewGoal(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addGoal()} placeholder="Add a goal..."/>
          <Btn size="sm" onClick={addGoal} style={{flexShrink:0}}>ADD</Btn>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {(local.goals||[]).map((g,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:T.input,borderRadius:8,padding:"8px 12px"}}>
            <span style={{fontSize:13}}>{g}</span>
            <button onClick={()=>removeGoal(i)} style={{background:"none",border:"none",color:T.muted,cursor:"pointer",fontSize:14}}>✕</button>
          </div>)}
          {(!local.goals||local.goals.length===0)&&<div style={{color:T.muted,fontSize:13}}>No goals yet.</div>}
        </div>
      </Card>

      <Card>
        <div style={{fontSize:11,color:T.muted,letterSpacing:1,marginBottom:6}}>PRIORITY / WEAK POINTS</div>
        <div style={{fontSize:12,color:T.muted,marginBottom:12}}>What needs the most work.</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {MG.map(g=>{const on=(local.weakPoints||[]).includes(g);return <Pill key={g} active={on} onClick={()=>toggleWeak(g)}>{g}</Pill>;})}
        </div>
      </Card>

      <Btn size="lg" onClick={save}>{saved?"✓ SAVED":"SAVE PROFILE"}</Btn>
    </div>
  </div>;
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App(){
  const [tab,setTab]=useState("home");
  const [profile,setProfile]=useLS("giq_profile",{
    name:"",age:null,weight:84,experience:"Intermediate",
    wakeTime:"06:00",sleepTime:"22:30",gymTime:"06:30",
    goals:["Build size — overall","Increase strength on the big 3","Bring legs up to match upper body"],
    weakPoints:["Legs"],occupation:"",physicalDemand:"",workHours:"",injuries:""
  });
  const [checkins,setCheckins]=useLS("giq_checkins",[]);
  const [pbs,setPbs]=useLS("giq_pbs",{});
  const [plan,setPlan]=useLS("giq_plan",[]);
  const [pbResult,setPbResult]=useState(null);

  // All exercises — built-in + community custom
  const [allExercises,setAllExercises]=useState(BUILTIN_EXERCISES);
  useEffect(()=>{
    storageGet("shared-exercises",true).then(custom=>{
      if(custom&&Array.isArray(custom)){
        const merged=[...BUILTIN_EXERCISES];
        custom.forEach(ex=>{
          if(!merged.find(e=>e.name===ex.name)){
            merged.push(ex);
            EXERCISE_BODYPART[ex.name]=ex.bodyPart;
          }
        });
        setAllExercises(merged);
      }
    });
  },[]);

  return <>
    <style>{CSS}</style>
    <PBModal result={pbResult} onClose={()=>setPbResult(null)}/>
    <div style={{background:T.bg,minHeight:"100vh",paddingBottom:80}}>
      <div style={{padding:"14px 20px 0",position:"sticky",top:0,zIndex:50,background:"linear-gradient(#000 80%,transparent)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingBottom:8}}>
          <span className="bc" style={{fontSize:16,fontWeight:900,letterSpacing:2,color:T.accent}}>⚡ GYMIQ</span>
          <div style={{width:8,height:8,borderRadius:"50%",background:T.accent,boxShadow:T.accentGlow}}/>
        </div>
      </div>
      <div style={{padding:"8px 20px 0"}}>
        {tab==="home"    &&<Home    profile={profile} checkins={checkins} setCheckins={setCheckins} plan={plan} pbs={pbs} setPbs={setPbs} setPbResult={setPbResult} allExercises={allExercises}/>}
        {tab==="plan"    &&<Plan    plan={plan} setPlan={setPlan} allExercises={allExercises} setAllExercises={setAllExercises} profile={profile}/>}
        {tab==="pbs"     &&<PBs     pbs={pbs} setPbs={setPbs} setPbResult={setPbResult} allExercises={allExercises}/>}
        {tab==="board"   &&<Leaderboard username={profile.name} pbs={pbs}/>}
        {tab==="coach"   &&<Coach   profile={profile} checkins={checkins} pbs={pbs} plan={plan} allExercises={allExercises}/>}
        {tab==="profile" &&<Profile profile={profile} setProfile={setProfile}/>}
      </div>
    </div>
    <Nav tab={tab} setTab={setTab}/>
  </>;
}
