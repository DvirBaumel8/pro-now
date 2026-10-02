// Since 2026-10-01 there are no sample addresses: every walk gives one, the way a person would.
// Opens the picker from the home's address row, types an address, optionally "for someone else".
export async function setAddress(p, press, { typed = 'דיזנגוף 50, תל אביב · קומה 2', forName = null, fromHome = true } = {}) {
  if (fromHome) await press(/^שינוי כתובת$/);
  await p.getByLabel('כתובת חדשה').first().fill(typed);
  if (forName) {
    await p.getByLabel('הקריאה היא בשביל מישהו אחר').first().click({ force: true });
    await p.waitForTimeout(400);
    await p.getByLabel('שם מי שנמצא בבית').first().fill(forName);
    await p.getByLabel('טלפון של מי שנמצא בבית').first().fill('0521234567');
  }
  if (!(await press(/^אישור הכתובת/))) throw new Error('address: cannot confirm');
  await p.waitForTimeout(600);
}
