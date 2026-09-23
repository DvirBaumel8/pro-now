import { launchChromium } from './browser.mjs';

/**
 * CAN THE REVIEWER ANSWER HIS OWN QUOTE?
 *
 * Amit, looking at the professional's waiting panel with a quote sent:
 * *"איך אני מאשר כרגע את הקריאה מצד הלקוח לראות שזה עובד?"*
 *
 * The mechanism was always there — the customer gets a capsule reading
 * "הצעת מחיר ממתינה לאישורך" — and reaching it meant knowing to press
 * "לקוח" in the tab bar and then noticing a strip above it. So the
 * professional's demo row now carries the crossing, and this walks it:
 * sign in as a professional, take the sample call, drive it to the
 * diagnosis, WRITE a quote, send it, press the crossing, and check that
 * the screen on the other side is the customer's approval screen showing
 * THE AMOUNT THAT WAS JUST TYPED.
 *
 * The amount is the part that matters. A check that only asserts "we are
 * on the customer side" passes on a screen that has forgotten the quote,
 * which is the failure this whole series of comments has been about: a
 * control that moves you somewhere and delivers nothing.
 *
 * Proven by putting the fault back — see the note at the end.
 */
const PORT = process.env.PREVIEW_PORT ?? '4421';
const AMOUNT = '320';
const LINE = 'החלפת אטם וברז ניל';
const NOTE = 'כולל אחריות שנה';

const b = await launchChromium();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const problems = [];
p.on('pageerror', (e) => problems.push(`page threw: ${e}`));

const tap = async (name, ms = 1000) => {
  const ok = await p.getByRole('button', { name }).first().click({ timeout: 6000 }).then(() => true).catch(() => false);
  if (!ok) problems.push(`could not press ${name}`);
  await p.waitForTimeout(ms);
  return ok;
};
const fill = async (label, value) => {
  await p.getByLabel(label).fill(value).catch(() => problems.push(`no field called ${label}`));
};
const text = () => p.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));

await p.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2200);

// The professional's door, and the sign-in behind it.
await tap(/אני בעל מקצוע/, 1200);
await fill('מספר טלפון', '0501234567');
await tap(/שליחת קוד/, 900);
await fill('קוד האימות', '123456');
await tap(/^כניסה/, 1700);
await tap(/דילוג על ההסבר/, 1400);
// The explanation sheet opens itself on the first shift screen.
await tap(/^סגירה$/, 900);

// Online, one sample call, and the visit it turns into.
await tap(/התחלת משמרת/, 1400);
await tap(/קריאה לדוגמה/, 1600);
await tap(/קבלת העבודה/, 1600);
/*
 * AND THE SCREEN HAS TO BE A DIFFERENT SCREEN AT EACH STEP.
 *
 * Amit: *"עדיין כל המסכים פה אותו דבר ואין שום שינוי בין בדרך לבדיקה
 * להצעת מחיר, הכל נשאר באותו מסך."* Each stage already had its own
 * screen key and its own transition — what never changed was what was
 * ON it, which is the half a transition check cannot see. So this reads
 * the screen at each step and asserts it actually says and shows
 * something else.
 */
const stageText = [];
const stageOrder = [];
const readStage = async () => {
  stageText.push(await text());
  stageOrder.push(
    await p.evaluate(() => {
      /*
       * The section HEADINGS, on their own lines. "הלקוח" as a plain
       * substring also matches "מה שהלקוח תיאר" inside the sentence
       * above both cards, which put the customer ahead of the problem
       * at every stage and made this check fail for the wrong reason.
       */
      const t = document.body.innerText;
      const line = (label) => {
        const m = t.match(new RegExp('^' + label + '$', 'm'));
        return m && m.index !== undefined ? m.index : -1;
      };
      return { problem: line('מה הבעיה'), who: line('הלקוח'), nav: t.indexOf('ניווט לכתובת') };
    })
  );
};

await readStage();
await tap(/יוצא לדרך/, 1200);
await readStage();
await tap(/הגעתי/, 1200);
await readStage();
await tap(/מתחיל אבחון/, 1200);
await readStage();

/*
 * NOT "different", but DIFFERENT ENOUGH TO NOTICE.
 *
 * The first version of this asked only that the two texts not be
 * identical, and it passed with the fault fully in place: the status
 * pill changes one word at every step, so the screens were never
 * literally equal while being, to a person, the same screen. That is
 * exactly what Amit was reporting, so a check satisfied by it is a
 * check that agrees with the bug.
 *
 * The four stages walked here are assigned, en route, arrived and
 * diagnosis. The first two are ONE thing to the professional — the
 * tracker deliberately puts both at "בדרך", because the difference is
 * whether a van has pulled out — so they are only required to differ at
 * all. Arriving is a change of what the screen is FOR, and that one has
 * to be a change you cannot miss: eight words is roughly a sentence,
 * about the smallest thing somebody glancing at a phone registers.
 */
const MUST_CHANGE_A_LOT = new Set([2]);
for (let i = 1; i < stageText.length; i += 1) {
  const a = new Set(stageText[i - 1].split(/\s+/));
  const changed = stageText[i].split(/\s+/).filter((w) => !a.has(w)).length;
  const need = MUST_CHANGE_A_LOT.has(i) ? 8 : 3;
  if (changed < need) {
    problems.push(`step ${i} of the visit looks like step ${i - 1} — only ${changed} words differ`);
  }
}
/*
 * The drive belongs to the drive. A navigation button on the screen of
 * somebody already standing in the kitchen is the clutter that made
 * four stages read as one.
 */
if (stageOrder[1].nav < 0) problems.push('no way to navigate while still on the way');
if (stageOrder[2].nav >= 0) problems.push('still offering navigation after arriving');
/*
 * And what the customer described moves to the top at the moment it
 * becomes the thing being looked at.
 */
if (!(stageOrder[2].problem >= 0 && stageOrder[2].problem < stageOrder[2].who)) {
  problems.push('after arriving, what the customer described is still below their contact card');
}
if (!(stageOrder[0].who >= 0 && stageOrder[0].who < stageOrder[0].problem)) {
  problems.push('before setting off, the customer is not the first thing on the screen');
}

/*
 * THE QUOTE IS WRITTEN, NOT SUMMONED. The amount below is typed here and
 * has to survive the crossing — that is the whole assertion.
 */
await tap(/שליחת הצעת מחיר/, 1300);
await fill('תיאור שורה 1', LINE);
await fill('כמות בשורה 1', '1');
await fill('מחיר ליחידה בשורה 1', AMOUNT);
await fill('הערה ללקוח', NOTE);

/*
 * THE THREE CHIPS ON A LINE HAVE TO DO SOMETHING YOU CAN SEE.
 *
 * Amit: *"מה קורה שאני לוחץ על עבודה חומרים אחר?"* They were already
 * doing something real — the chip is the label the line carries on the
 * customer's approval screen — and nothing on the builder moved when
 * you pressed one, so from where he was standing the control did
 * nothing. The running split is the visible half of that answer, so
 * this presses a chip and asserts a number appears.
 *
 * The extra line is removed again afterwards, so everything below this
 * block walks the same one-line quote it always did.
 */
await tap(/הוספת שורה/, 800);
await fill('תיאור שורה 2', 'ברז וניל');
await fill('כמות בשורה 2', '1');
await fill('מחיר ליחידה בשורה 2', '220');
const beforeChip = await text();
if (/עבודה ‏\d/.test(beforeChip)) {
  problems.push('the builder splits the total before there is more than one kind in it');
}
await p.getByRole('radio', { name: /חומרים · שורה 2/ }).first().click({ timeout: 6000 }).catch(() =>
  problems.push('the materials chip on a line is not pressable')
);
await p.waitForTimeout(700);
const afterChip = await text();
if (!afterChip.includes('חומרים ‏220')) {
  problems.push('pressing "חומרים" changes nothing the professional can see');
}
if (!afterChip.includes(`עבודה ‏${AMOUNT}`)) {
  problems.push('the split does not say what is left as labour');
}
await tap(/מחיקת שורה 2/, 800);

await tap(/שליחת הצעת המחיר ללקוח/, 1500);

const waiting = await text();
if (!waiting.includes('ממתין לאישור הלקוח')) {
  problems.push('after sending the quote the professional is not on the waiting panel');
}

// The crossing itself.
const crossed = await tap(/מעבר לצד הלקוח/, 1800);

if (crossed) {
  const after = await text();
  /*
   * WHICH SIDE WE ARE ON, by the button that leaves it. "לקוח" is the
   * professional's way out; "מעבר לצד בעל המקצוע" is the customer's.
   * Asking for the one that should be there is the only version of this
   * that cannot pass by accident — see the `exact: true` lesson in
   * sweep.mjs, where a substring match put a probe on the wrong side and
   * reported the wrong conclusion with complete confidence.
   */
  const onCustomerSide = (await p.getByRole('button', { name: 'מעבר לצד בעל המקצוע', exact: true }).count()) > 0;
  if (!onCustomerSide) problems.push('the crossing did not land on the customer side');
  const approveButton = p.getByRole('button', { name: /אישור הצעת מחיר/ });
  if ((await approveButton.count()) === 0) {
    problems.push('the crossing did not land on the approval screen');
  }
  /*
   * THE LINE, THE NOTE AND THE AMOUNT — all three, because each one
   * alone can survive a screen that has lost the quote. The amount is
   * in the fixture's neighbourhood; the description is not, and a
   * screen showing somebody else's quote cannot produce it.
   */
  if (!after.includes(LINE)) {
    problems.push('the approval screen does not show the line the professional wrote');
  }
  if (!after.includes(NOTE)) {
    problems.push('the approval screen does not show the note the professional wrote');
  }
  if (!after.includes(AMOUNT)) {
    problems.push(`the approval screen does not show the amount that was written (${AMOUNT})`);
  }

  /*
   * AND IT HAS TO ANSWER. A screen you can reach and not act on is the
   * same dead end one screen further along.
   */
  await tap(/אישור הצעת מחיר/, 1600);
  if ((await p.getByRole('button', { name: /אישור הצעת מחיר/ }).count()) > 0) {
    problems.push('approving the quote left the customer on the approval screen');
  }

  /*
   * AND THE PANEL BEHIND IT HAS TO KNOW.
   *
   * Amit, on that panel: *"איך הצעת מחיר תשלח אם הוא כבר סיים את
   * העבודה? זה אמור להיות לפני."* Its money line used to be one fixed
   * sentence for the whole visit, so a promise that a quote was coming
   * stayed on screen after one had been approved. It is derived now
   * (`visitMoneyLineHe`), and this is the state the fault was loudest
   * in: the work is running, and the line must say the approved amount
   * back rather than promise a quote.
   */
  /*
   * AND THE WAY BACK, which is the same fault mirrored. Amit, standing
   * on the customer's screen having just approved: *"איך אני חוזר לצד
   * המקצוען אחרי שאישרתי את ההצעה מצד הלקוח?"* The header's switch was
   * always there and said nothing about now.
   */
  const backRow = p.getByRole('button', { name: /חזרה לצד בעל המקצוע/ });
  if ((await backRow.count()) === 0) {
    problems.push('after approving, the customer is offered no way back to the professional');
  } else {
    await backRow.first().click({ timeout: 6000 }).catch(() => problems.push('the way back would not press'));
    await p.waitForTimeout(1600);
    if ((await p.getByRole('button', { name: 'לקוח', exact: true }).count()) === 0) {
      problems.push('the way back did not land on the professional side');
    }
    if ((await p.getByRole('button', { name: /סיימתי את העבודה/ }).count()) === 0) {
      problems.push('the professional side did not move to the work after the approval');
    }
    /*
     * AND BACK AGAIN, which is where the crossing used to cost you the
     * job: the two sides are two apps, so switching unmounts one and
     * everything it held went with it — you approved a quote, looked at
     * his screen, came back and landed on the home grid. The customer's
     * place is remembered above both sides now, and the assertions
     * below are on the panel this has to return to.
     */
    const returned = await p
      .getByRole('button', { name: 'לקוח', exact: true })
      .first()
      .click({ timeout: 6000 })
      .then(() => true)
      .catch(() => false);
    if (!returned) problems.push('there is no way back to the customer from the job');
    await p.waitForTimeout(1600);
  }

  const afterApproval = await text();
  if (/הצעת מחיר תישלח|ההצעה תגיע/.test(afterApproval)) {
    problems.push('the panel still promises a quote after one was approved');
  }
  if (!afterApproval.includes(`אישרתם ‏${AMOUNT}`)) {
    problems.push('the panel does not say the approved amount back while the work runs');
  }
  /*
   * AND ALL THE WAY TO THE END, because the closing screen is where the
   * approved quote has to be still in one piece. Amit: *"חייב עמוד תודה
   * אחרי הקבלה... וסיכום יותר משמעותי של השירות שהוא קיבל."* The screen
   * named the service and the person and stopped there, over an amount
   * that was hard-coded — so somebody who had just agreed to one price
   * was thanked for another.
   */
  await tap(/המקצוען סיים את העבודה/, 1400);
  await tap(/סיכום העבודה/, 1500);
  await tap(/^5 כוכבים$/, 600);
  await tap(/שליחת דירוג/, 1600);
  const closing = await text();
  if (closing.includes('תודה')) {
    if (!closing.includes(LINE)) {
      problems.push('the closing screen does not say what was done, in the words that were approved');
    }
    if (!closing.includes(AMOUNT)) {
      problems.push('the closing screen shows an amount that is not the one approved');
    }
  } else {
    problems.push('the walk did not reach the closing screen');
  }
}

/*
 * WHY THERE IS NO PLANTED CONTROL HERE.
 *
 * sweep.mjs plants a card off the edge of the screen and asks its own
 * check to catch it, because that check is a filter over every div on
 * the page and one careless condition turns it into a function that
 * always passes. This one is not that shape: every step is a press that
 * reports its own failure, so a walk that stops early cannot reach the
 * assertions — it arrives carrying the step that broke.
 *
 * What it was proven against instead is the fault itself. With
 * `onSeeAsCustomer` left unwired in the shell — the exact state this was
 * written in, a button on the professional's row that does nothing —
 * this reported six failures in a row, starting with "the crossing did
 * not land on the customer side" and ending with the approval button it
 * could then not press. Recorded because a check that has only ever
 * passed is not evidence of anything.
 */
console.log('PROBLEMS:', problems.length ? '\n  ' + problems.join('\n  ') : 'none');
await b.close();
process.exit(problems.length ? 1 : 0);
