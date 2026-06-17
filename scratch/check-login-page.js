async function checkLoginPage() {
  console.log('Sending GET request to http://localhost:3003/login...');
  try {
    const res = await fetch('http://localhost:3003/login');
    console.log('Response Status:', res.status);
    const text = await res.text();
    console.log('HTML Length:', text.length);
    if (res.status === 200 && text.includes('<!DOCTYPE html>')) {
      console.log('✅ LOGIN PAGE LOADED SUCCESSFULLY! No 404/500 errors.');
    } else {
      console.error('❌ LOGIN PAGE LOADING FAILED. Status:', res.status);
    }
  } catch (err) {
    console.error('❌ Failed to fetch login page:', err.message);
  }
}

checkLoginPage();
