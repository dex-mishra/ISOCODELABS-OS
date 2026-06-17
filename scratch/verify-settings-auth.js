const url = 'http://localhost:3003/api/auth/login';
const credentials = {
  email: 'dex.mishra@gmail.com',
  password: 'admin123'
};

async function runTests() {
  console.log('--- STARTING SETTINGS & INTEGRATIONS API VERIFICATION ---');

  // 1. Authenticate
  console.log('1. Authenticating...');
  const loginRes = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });
  if (loginRes.status !== 200) {
    throw new Error(`Auth failed with status ${loginRes.status}`);
  }
  const { token } = await loginRes.json();
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  console.log('✅ Auth successful! Token obtained.');

  // 2. GET Settings
  console.log('\n2. Retrieving settings map...');
  const settingsRes = await fetch('http://localhost:3003/api/settings', { headers });
  console.log('Status:', settingsRes.status);
  const settings = await settingsRes.json();
  console.log('Settings Keys:', Object.keys(settings));
  if (settingsRes.status === 200 && settings.google_ai_api_key) {
    console.log('✅ GET Settings successful!');
  } else {
    throw new Error('GET Settings failed.');
  }

  // 3. GET Integrations Status
  console.log('\n3. Retrieving integrations connection statuses...');
  const integrationsRes = await fetch('http://localhost:3003/api/settings/integrations', { headers });
  console.log('Status:', integrationsRes.status);
  const integrations = await integrationsRes.json();
  console.log('Integrations payload:', JSON.stringify(integrations, null, 2));
  if (integrationsRes.status === 200 && integrations.google && integrations.whatsapp && integrations.google_ai) {
    console.log('✅ GET Integrations status successful!');
  } else {
    throw new Error('GET Integrations status failed.');
  }

  // 4. Test Google AI Connection
  console.log('\n4. Testing Google AI connection with mock key...');
  const testConnRes = await fetch('http://localhost:3003/api/settings/test-connection', {
    method: 'POST',
    headers,
    body: JSON.stringify({ google_ai_api_key: 'mock-key-test' })
  });
  console.log('Status:', testConnRes.status);
  const testConnResult = await testConnRes.json();
  console.log('Connection test body:', testConnResult);
  if (testConnRes.status === 200 && testConnResult.success) {
    console.log('✅ Google AI Connection test successful!');
  } else {
    throw new Error('Google AI Connection test failed.');
  }

  // 5. Update Profile
  console.log('\n5. Updating profile details (name)...');
  const profileRes = await fetch('http://localhost:3003/api/settings/profile', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'Devansh Mishra',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80'
    })
  });
  console.log('Status:', profileRes.status);
  const profileResult = await profileRes.json();
  console.log('Profile update body:', profileResult);
  if (profileRes.status === 200 && profileResult.success) {
    console.log('✅ Profile update successful!');
  } else {
    throw new Error('Profile update failed.');
  }

  // 6. Update Theme / Appearance
  console.log('\n6. Updating appearance preferences...');
  const themeRes = await fetch('http://localhost:3003/api/settings/theme', {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      theme_mode: 'dark',
      theme_accent_color: '#0071e3',
      theme_density: 'compact'
    })
  });
  console.log('Status:', themeRes.status);
  const themeResult = await themeRes.json();
  console.log('Theme update body:', themeResult);
  if (themeRes.status === 200 && themeResult.success) {
    console.log('✅ Appearance preference update successful!');
  } else {
    throw new Error('Appearance preference update failed.');
  }

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉');
}

runTests().catch(err => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
