import test from 'node:test';
import assert from 'node:assert/strict';
import {
  authenticateLocalUser,
  changeUserPassword,
  getCredentialsStore,
  getUserManagementRecords,
  safeLocalStorage
} from '../src/services/authCredentials.js';

test('Admin Password Change & Persistence Suite', async (t) => {
  // Clear any existing test overrides before starting
  safeLocalStorage.clear();

  const adminEmail = 'Anukraha.Magdalene@valuemomentum.com';
  const initialPassword = 'Anukraha.Magdalene';
  const newPassword1 = 'NewAdminPass2026!';
  const newPassword2 = 'UpdatedSuperSecret99!';

  await t.test('1. Initial Admin authentication with seed password', () => {
    const authSuccess = authenticateLocalUser(adminEmail, initialPassword);
    assert.equal(authSuccess.success, true, 'Initial admin login should succeed');
    assert.equal(authSuccess.data?.role, 'Admin', 'Authenticated user role should be Admin');

    const authFail = authenticateLocalUser(adminEmail, 'WrongPassword123');
    assert.equal(authFail.success, false, 'Login with incorrect password must fail');
  });

  await t.test('2. Change password & verify old password is overridden', () => {
    const changeResult = changeUserPassword(adminEmail, initialPassword, newPassword1);
    assert.equal(changeResult.success, true, 'Password change request should succeed');

    // Verify old password FAILS
    const oldAuth = authenticateLocalUser(adminEmail, initialPassword);
    assert.equal(oldAuth.success, false, 'Old password must be overridden and fail authentication');

    // Verify new password SUCCEEDS
    const newAuth = authenticateLocalUser(adminEmail, newPassword1);
    assert.equal(newAuth.success, true, 'New password must succeed authentication');
  });

  await t.test('3. Verify persistent storage across store re-fetches', () => {
    // Force re-reading store from storage
    const store = getCredentialsStore();
    const cleanEmail = adminEmail.toLowerCase();

    assert.ok(store[cleanEmail], 'Admin user entry should exist in store');
    assert.equal(store[cleanEmail].password, newPassword1, 'Stored password must equal newPassword1');

    // Verify roster record synchronization
    const roster = getUserManagementRecords();
    const adminRecord = roster.find((r) => r.email && r.email.toLowerCase() === cleanEmail);
    assert.ok(adminRecord, 'User management record should exist');
    assert.equal(adminRecord.password, newPassword1, 'User management record password must be synced');
  });

  await t.test('4. Sequential password update & verify clean override', () => {
    const changeResult2 = changeUserPassword(adminEmail, newPassword1, newPassword2);
    assert.equal(changeResult2.success, true, 'Second password change should succeed');

    // First new password should now fail
    const auth1 = authenticateLocalUser(adminEmail, newPassword1);
    assert.equal(auth1.success, false, 'Previous new password should no longer work');

    // Second new password should work
    const auth2 = authenticateLocalUser(adminEmail, newPassword2);
    assert.equal(auth2.success, true, 'Latest password should succeed');
    assert.equal(auth2.data?.email, adminEmail, 'Email in DTO should match');
  });
});
