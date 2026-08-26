import test from 'node:test';
import assert from 'node:assert/strict';
import {
  authenticateLocalUser,
  changeUserPassword,
  getDefaultPasswordForEmail,
  getUserManagementRecords,
  saveUserManagementRecords,
  safeLocalStorage
} from '../src/services/authCredentials.js';

test('Admin & Multi-Role Password Management Suite', async (t) => {
  // Clear any existing test overrides before starting
  safeLocalStorage.clear();

  const adminEmail = 'Anukraha.Magdalene@valuemomentum.com';
  const initialPassword = 'anukraha.magdalene'; // All lowercase prefix before @
  const newPassword1 = 'NewAdminPass2026!';
  const newPassword2 = 'UpdatedSuperSecret99!';

  await t.test('1. Default password format is all lowercase prefix before @', () => {
    assert.equal(
      getDefaultPasswordForEmail('Anukraha.Magdalene@valuemomentum.com'),
      'anukraha.magdalene'
    );
  });

  await t.test('2. Initial Admin authentication with lowercase seed password', () => {
    const authSuccess = authenticateLocalUser(adminEmail, initialPassword, 'Admin');
    assert.equal(authSuccess.success, true, 'Initial admin login should succeed');
    assert.equal(authSuccess.data?.role, 'Admin', 'Authenticated user role should be Admin');

    const authFail = authenticateLocalUser(adminEmail, 'WrongPassword123', 'Admin');
    assert.equal(authFail.success, false, 'Login with incorrect password must fail');
  });

  await t.test('3. Change password & verify old password is overridden', () => {
    const changeResult = changeUserPassword(adminEmail, initialPassword, newPassword1, 'Admin');
    assert.equal(changeResult.success, true, 'Password change request should succeed');

    // Verify old password FAILS
    const oldAuth = authenticateLocalUser(adminEmail, initialPassword, 'Admin');
    assert.equal(oldAuth.success, false, 'Old password must be overridden and fail authentication');

    // Verify new password SUCCEEDS
    const newAuth = authenticateLocalUser(adminEmail, newPassword1, 'Admin');
    assert.equal(newAuth.success, true, 'New password must succeed authentication');
  });

  await t.test('4. Role-Scoped Password Isolation for accounts with same email', () => {
    const sharedEmail = 'Shared.User@valuemomentum.com';
    const currentRoster = getUserManagementRecords();

    // Add two records with exact same email but different roles
    const empRecord = {
      id: 'usr-emp-101',
      vamId: '100101',
      name: 'Shared User',
      email: sharedEmail,
      phoneNumber: '9900000001',
      role: 'Employee' as const,
      designation: 'Graduate Trainee',
      addedOn: '01-Jan-2026',
      status: 'Active' as const,
      access: 'Enabled' as const,
      addedBy: 'Admin',
      batch: 'GT-2026-Batch-01'
    };

    const adminRecord = {
      id: 'usr-admin-102',
      vamId: '100102',
      name: 'Shared User',
      email: sharedEmail,
      phoneNumber: '9900000002',
      role: 'Admin' as const,
      designation: 'L&D Lead',
      addedOn: '01-Jan-2026',
      status: 'Active' as const,
      access: 'Enabled' as const,
      addedBy: 'Admin',
      batch: 'L&D Leadership'
    };

    saveUserManagementRecords([...currentRoster, empRecord, adminRecord]);

    // Both start with default password 'shared.user'
    const defaultPw = 'shared.user';

    const empInit = authenticateLocalUser(sharedEmail, defaultPw, 'Employee');
    assert.equal(empInit.success, true);
    assert.equal(empInit.data?.role, 'Employee');

    const adminInit = authenticateLocalUser(sharedEmail, defaultPw, 'Admin');
    assert.equal(adminInit.success, true);
    assert.equal(adminInit.data?.role, 'Admin');

    // Change Employee password
    const empNewPass = 'EmployeeSecret123!';
    const empChange = changeUserPassword(sharedEmail, defaultPw, empNewPass, 'Employee');
    assert.equal(empChange.success, true);

    // Employee now authenticates with empNewPass
    const empAuth = authenticateLocalUser(sharedEmail, empNewPass, 'Employee');
    assert.equal(empAuth.success, true);
    assert.equal(empAuth.data?.role, 'Employee');

    // Admin STILL authenticates with defaultPw!
    const adminStillDefault = authenticateLocalUser(sharedEmail, defaultPw, 'Admin');
    assert.equal(adminStillDefault.success, true, 'Admin account retains its own default password');
    assert.equal(adminStillDefault.data?.role, 'Admin');
  });

  await t.test('5. Deleting a credential resets password override for re-added user', () => {
    const tempEmail = 'Temp.User@valuemomentum.com';
    const tempRoster = getUserManagementRecords();

    const tempRecord = {
      id: 'usr-temp-999',
      vamId: '999999',
      name: 'Temp User',
      email: tempEmail,
      phoneNumber: '9999999991',
      role: 'Employee' as const,
      designation: 'Trainee',
      addedOn: '01-Jan-2026',
      status: 'Active' as const,
      access: 'Enabled' as const,
      addedBy: 'Admin',
      batch: 'GT-2026-Batch-01'
    };

    // Add and change password
    saveUserManagementRecords([...tempRoster, tempRecord]);
    changeUserPassword(tempEmail, 'temp.user', 'TempPass2026!', 'Employee');

    // Delete record from roster
    const rosterWithoutTemp = getUserManagementRecords().filter((r) => r.id !== tempRecord.id);
    saveUserManagementRecords(rosterWithoutTemp);

    // Re-add record
    saveUserManagementRecords([...rosterWithoutTemp, tempRecord]);

    // Password must revert to default 'temp.user'
    const reAddedDefault = authenticateLocalUser(tempEmail, 'temp.user', 'Employee');
    assert.equal(reAddedDefault.success, true, 'Re-added user should authenticate with default password');
  });
});

