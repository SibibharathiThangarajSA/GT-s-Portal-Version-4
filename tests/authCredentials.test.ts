import test from 'node:test';
import assert from 'node:assert/strict';
import {
  authenticateLocalUser,
  changeUserPassword,
  getDefaultPasswordForEmail,
  getUserManagementRecords,
  saveUserManagementRecords,
  isAllowedDomain,
  safeLocalStorage
} from '../src/services/authCredentials.js';

test('Comprehensive Auth, Add Credential & Password Change Test Suite', async (t) => {
  // Clear any existing test overrides before starting
  safeLocalStorage.clear();

  // =========================================================================
  // 1. DEFAULT PASSWORD GENERATION & DOMAIN VALIDATION
  // =========================================================================
  await t.test('1.1 POSITIVE: Default password format is always lowercase prefix before @', () => {
    assert.equal(
      getDefaultPasswordForEmail('Anukraha.Magdalene@valuemomentum.com'),
      'anukraha.magdalene'
    );
    assert.equal(
      getDefaultPasswordForEmail('Sibibharathi.Thangaraj@valuemomentum.com'),
      'sibibharathi.thangaraj'
    );
    assert.equal(
      getDefaultPasswordForEmail('Sudhir.Vittapu@owlsure.com'),
      'sudhir.vittapu'
    );
  });

  await t.test('1.2 NEGATIVE: Invalid default password inputs return empty string', () => {
    assert.equal(getDefaultPasswordForEmail(''), '');
    assert.equal(getDefaultPasswordForEmail('-'), '');
    assert.equal(getDefaultPasswordForEmail('invalidemail.com'), '');
  });

  await t.test('1.3 POSITIVE & NEGATIVE: Domain validation rules', () => {
    assert.equal(isAllowedDomain('user@valuemomentum.com'), true);
    assert.equal(isAllowedDomain('leader@owlsure.com'), true);
    assert.equal(isAllowedDomain('hacker@gmail.com'), false);
    assert.equal(isAllowedDomain('fake@yahoo.com'), false);
    assert.equal(isAllowedDomain(''), false);
  });

  // =========================================================================
  // 2. SEED CREDENTIALS LOGIN SUITE
  // =========================================================================
  await t.test('2.1 POSITIVE: Seed Admin login with lowercase default password', () => {
    const res = authenticateLocalUser('Anukraha.Magdalene@valuemomentum.com', 'anukraha.magdalene', 'Admin');
    assert.equal(res.success, true);
    assert.equal(res.data?.role, 'Admin');
    assert.equal(res.data?.email, 'Anukraha.Magdalene@valuemomentum.com');
  });

  await t.test('2.2 POSITIVE: Seed GT/Employee login with lowercase default password', () => {
    const res = authenticateLocalUser('Sibibharathi.Thangaraj@valuemomentum.com', 'sibibharathi.thangaraj', 'GT');
    assert.equal(res.success, true);
    assert.equal(res.data?.role, 'Employee');
  });

  await t.test('2.3 POSITIVE: Case-insensitive default password matching (supports TitleCase and lowercase)', () => {
    const resUpper = authenticateLocalUser('Sibibharathi.Thangaraj@valuemomentum.com', 'Sibibharathi.Thangaraj', 'GT');
    assert.equal(resUpper.success, true);
    assert.equal(resUpper.data?.role, 'Employee');

    const resLower = authenticateLocalUser('Sibibharathi.Thangaraj@valuemomentum.com', 'sibibharathi.thangaraj', 'GT');
    assert.equal(resLower.success, true);
  });

  await t.test('2.4 NEGATIVE: Incorrect password fails authentication', () => {
    const res = authenticateLocalUser('Anukraha.Magdalene@valuemomentum.com', 'WrongPassword123!', 'Admin');
    assert.equal(res.success, false);
    assert.equal(res.message, 'Incorrect email ID or password.');
  });

  await t.test('2.5 NEGATIVE: Unpermitted domain email fails login', () => {
    const res = authenticateLocalUser('hacker@gmail.com', 'hackerpass');
    assert.equal(res.success, false);
    assert.match(res.message || '', /Only @valuemomentum.com and @owlsure.com/);
  });

  await t.test('2.6 NEGATIVE: Non-existent email fails login', () => {
    const res = authenticateLocalUser('unknown.user@valuemomentum.com', 'unknownpass');
    assert.equal(res.success, false);
    assert.equal(res.message, 'Incorrect email ID or password.');
  });

  // =========================================================================
  // 3. ADD CREDENTIAL & MULTI-ROLE SUITE
  // =========================================================================
  const testRoster = getUserManagementRecords();

  await t.test('3.1 POSITIVE: Add Associate role account with phone only (VAM & Email disabled = "-")', () => {
    const assocRecord = {
      id: 'usr-assoc-201',
      vamId: '-',
      name: 'Associate Kumar',
      email: '-',
      phoneNumber: '9876543210',
      role: 'Associate' as const,
      designation: 'Associate Trainee',
      addedOn: '26-Aug-2026',
      status: 'Active' as const,
      access: 'Enabled' as const,
      addedBy: 'Admin',
      batch: 'GT-2026-Batch-01'
    };

    saveUserManagementRecords([...testRoster, assocRecord]);

    const updated = getUserManagementRecords();
    const found = updated.find((u) => u.id === assocRecord.id);
    assert.ok(found);
    assert.equal(found.role, 'Associate');
    assert.equal(found.email, '-');
  });

  await t.test('3.2 POSITIVE: Add Associate role account with unlocked/enabled VAM ID and Email', () => {
    const current = getUserManagementRecords();
    const unlockedAssoc = {
      id: 'usr-assoc-202',
      vamId: '109999',
      name: 'Unlocked Associate',
      email: 'Unlocked.Associate@valuemomentum.com',
      phoneNumber: '9876543211',
      role: 'Associate' as const,
      designation: 'Associate Software Engineer',
      addedOn: '26-Aug-2026',
      status: 'Active' as const,
      access: 'Enabled' as const,
      addedBy: 'Admin',
      batch: 'GT-2026-Batch-01'
    };

    saveUserManagementRecords([...current, unlockedAssoc]);

    // Authenticate unlocked associate with default password
    const res = authenticateLocalUser('Unlocked.Associate@valuemomentum.com', 'unlocked.associate', 'GT');
    assert.equal(res.success, true);
    assert.equal(res.data?.role, 'Associate');
  });

  await t.test('3.3 POSITIVE: Add Same Email & VAM ID under DIFFERENT Roles (Multi-Role Support)', () => {
    const current = getUserManagementRecords();
    const sharedEmail = 'MultiRole.User@valuemomentum.com';

    const empRole = {
      id: 'usr-multirole-emp',
      vamId: '108888',
      name: 'Multi Role User',
      email: sharedEmail,
      phoneNumber: '9111111111',
      role: 'Employee' as const,
      designation: 'Graduate Trainee',
      addedOn: '26-Aug-2026',
      status: 'Active' as const,
      access: 'Enabled' as const,
      addedBy: 'Admin',
      batch: 'GT-2026-Batch-01'
    };

    const adminRole = {
      id: 'usr-multirole-admin',
      vamId: '108888',
      name: 'Multi Role User',
      email: sharedEmail,
      phoneNumber: '9111111111',
      role: 'Admin' as const,
      designation: 'L&D Lead',
      addedOn: '26-Aug-2026',
      status: 'Active' as const,
      access: 'Enabled' as const,
      addedBy: 'Admin',
      batch: 'L&D Leadership'
    };

    saveUserManagementRecords([...current, empRole, adminRole]);

    // Both log in cleanly with default password 'multirole.user' in their respective tabs
    const empLogin = authenticateLocalUser(sharedEmail, 'multirole.user', 'GT');
    assert.equal(empLogin.success, true);
    assert.equal(empLogin.data?.role, 'Employee');

    const adminLogin = authenticateLocalUser(sharedEmail, 'multirole.user', 'Admin');
    assert.equal(adminLogin.success, true);
    assert.equal(adminLogin.data?.role, 'Admin');
  });

  await t.test('3.4 NEGATIVE: Duplicate Email under SAME Role is detected', () => {
    const current = getUserManagementRecords();
    const duplicateEmail = 'MultiRole.User@valuemomentum.com';

    // Searching for same role 'Employee' should find collision
    const existing = current.find(
      (u) => u.role === 'Employee' && u.email && u.email.trim().toLowerCase() === duplicateEmail.toLowerCase()
    );

    assert.ok(existing, 'Duplicate email under same role must be flagged');
  });

  // =========================================================================
  // 4. CHANGE PASSWORD & ROLE ISOLATION SUITE
  // =========================================================================
  await t.test('4.1 POSITIVE: Changing password for Employee account updates ONLY Employee account', () => {
    const sharedEmail = 'MultiRole.User@valuemomentum.com';
    const defaultPw = 'multirole.user';
    const newEmpPw = 'NewEmpPassword123!';

    // Change Employee password
    const changeRes = changeUserPassword(sharedEmail, defaultPw, newEmpPw, 'Employee');
    assert.equal(changeRes.success, true);

    // Employee logs in with NEW password
    const empNewLogin = authenticateLocalUser(sharedEmail, newEmpPw, 'GT');
    assert.equal(empNewLogin.success, true);
    assert.equal(empNewLogin.data?.role, 'Employee');

    // Employee fails with OLD password
    const empOldLogin = authenticateLocalUser(sharedEmail, defaultPw, 'GT');
    assert.equal(empOldLogin.success, false);

    // Admin STILL logs in with DEFAULT password 'multirole.user'!
    const adminLogin = authenticateLocalUser(sharedEmail, defaultPw, 'Admin');
    assert.equal(adminLogin.success, true, 'Admin account retains its own independent password');
    assert.equal(adminLogin.data?.role, 'Admin');
  });

  await t.test('4.2 POSITIVE: Changing password for Admin account updates ONLY Admin account', () => {
    const sharedEmail = 'MultiRole.User@valuemomentum.com';
    const defaultPw = 'multirole.user';
    const newAdminPw = 'SuperSecretAdmin99!';

    // Change Admin password
    const changeRes = changeUserPassword(sharedEmail, defaultPw, newAdminPw, 'Admin');
    assert.equal(changeRes.success, true);

    // Admin logs in with NEW Admin password
    const adminNewLogin = authenticateLocalUser(sharedEmail, newAdminPw, 'Admin');
    assert.equal(adminNewLogin.success, true);
    assert.equal(adminNewLogin.data?.role, 'Admin');

    // Employee STILL logs in with ITS OWN password 'NewEmpPassword123!'
    const empLogin = authenticateLocalUser(sharedEmail, 'NewEmpPassword123!', 'GT');
    assert.equal(empLogin.success, true, 'Employee account retains its own separate password');
    assert.equal(empLogin.data?.role, 'Employee');
  });

  await t.test('4.3 NEGATIVE: Change password with incorrect current password fails', () => {
    const res = changeUserPassword('MultiRole.User@valuemomentum.com', 'WrongCurrentPassword', 'NewValidPass123!', 'Admin');
    assert.equal(res.success, false);
    assert.equal(res.message, 'Current password is incorrect.');
  });

  await t.test('4.4 NEGATIVE: Change password to identical current password fails', () => {
    const res = changeUserPassword('MultiRole.User@valuemomentum.com', 'SuperSecretAdmin99!', 'SuperSecretAdmin99!', 'Admin');
    assert.equal(res.success, false);
    assert.match(res.message, /cannot be the same/);
  });

  await t.test('4.5 NEGATIVE: Change password to short password (< 8 chars) fails', () => {
    const res = changeUserPassword('MultiRole.User@valuemomentum.com', 'SuperSecretAdmin99!', 'short', 'Admin');
    assert.equal(res.success, false);
    assert.match(res.message, /at least 8 characters/);
  });

  // =========================================================================
  // 5. DELETION & RESET TO DEFAULT PASSWORD LIFECYCLE SUITE
  // =========================================================================
  await t.test('5.1 POSITIVE: Deleting a credential clears custom password overrides; re-adding resets to default password', () => {
    const tempEmail = 'Lifecycle.User@valuemomentum.com';
    const current = getUserManagementRecords();

    const tempRecord = {
      id: 'usr-lifecycle-99',
      vamId: '107777',
      name: 'Lifecycle User',
      email: tempEmail,
      phoneNumber: '9222222222',
      role: 'Employee' as const,
      designation: 'Graduate Trainee',
      addedOn: '26-Aug-2026',
      status: 'Active' as const,
      access: 'Enabled' as const,
      addedBy: 'Admin',
      batch: 'GT-2026-Batch-01'
    };

    // 1. Add record
    saveUserManagementRecords([...current, tempRecord]);

    // 2. Change password
    const customPass = 'CustomLifecyclePass1!';
    changeUserPassword(tempEmail, 'lifecycle.user', customPass, 'Employee');

    // Verify custom pass works
    const loginCustom = authenticateLocalUser(tempEmail, customPass, 'GT');
    assert.equal(loginCustom.success, true);

    // 3. Delete record (simulating removal from User Management)
    const rosterWithoutTemp = getUserManagementRecords().filter((u) => u.id !== tempRecord.id);
    saveUserManagementRecords(rosterWithoutTemp);

    // 4. Re-add record (simulating adding back to User Management)
    saveUserManagementRecords([...rosterWithoutTemp, tempRecord]);

    // 5. Password MUST reset back to default lowercase password 'lifecycle.user'
    const loginDefault = authenticateLocalUser(tempEmail, 'lifecycle.user', 'GT');
    assert.equal(loginDefault.success, true, 'Re-added user authenticates with default lowercase password');

    const loginOldCustom = authenticateLocalUser(tempEmail, customPass, 'GT');
    assert.equal(loginOldCustom.success, false, 'Old custom password should no longer work after deletion');
  });
});


