/**
 * Create Admin User Script
 * 
 * This script sets Firebase custom claims to promote a user to admin.
 * 
 * Usage:
 *   node scripts/create-admin-user.js <email> [role]
 * 
 * Examples:
 *   node scripts/create-admin-user.js solo@solo.com superAdmin
 *   node scripts/create-admin-user.js admin@zentype.app admin
 * 
 * Roles:
 *   - admin: Basic admin access (read-only operations, view dashboards)
 *   - superAdmin: Full admin control (promote users, delete accounts, manage subscriptions)
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccountPath = path.join(
  __dirname,
  '..',
  'zentype-65eb3-firebase-adminsdk-fbsvc-24a6afa1cb.json'
);

admin.initializeApp({
  credential: admin.credential.cert(require(serviceAccountPath))
});

const auth = admin.auth();
const db = admin.firestore();

/**
 * Set admin custom claims for a user
 */
async function createAdminUser(email, role = 'admin') {
  try {
    console.log(`\n🔍 Searching for user: ${email}...`);

    // Get user by email
    const user = await auth.getUserByEmail(email);
    console.log(`✅ Found user: ${user.email} (UID: ${user.uid})`);

    // Define custom claims based on role
    let customClaims = {};
    
    if (role === 'superAdmin') {
      customClaims = {
        admin: true,
        superAdmin: true,
        canDeleteUsers: true,
        canManageSubscriptions: true
      };
      console.log(`\n🔐 Granting SUPER ADMIN permissions...`);
    } else if (role === 'admin') {
      customClaims = {
        admin: true,
        superAdmin: false,
        canDeleteUsers: false,
        canManageSubscriptions: true
      };
      console.log(`\n🔐 Granting ADMIN permissions...`);
    } else {
      throw new Error(`Invalid role: ${role}. Use 'admin' or 'superAdmin'`);
    }

    // Set custom claims
    await auth.setCustomUserClaims(user.uid, customClaims);
    console.log(`✅ Custom claims set successfully!`);

    // Log the action to audit log
    await db.collection('adminAuditLog').add({
      timestamp: new Date().toISOString(),
      adminUserId: 'SYSTEM',
      adminEmail: 'system@zentype.app',
      adminRole: 'superAdmin',
      action: 'role_granted',
      targetUserId: user.uid,
      targetUserEmail: user.email,
      changes: [{
        field: 'customClaims',
        oldValue: null,
        newValue: customClaims
      }],
      metadata: {
        reason: 'Admin user created via setup script',
        scriptName: 'create-admin-user.js'
      },
      success: true
    });
    console.log(`📝 Audit log entry created`);

    // Create or update subscription document
    const subscriptionRef = db.collection('subscriptions').doc(user.uid);
    const subscriptionDoc = await subscriptionRef.get();

    if (!subscriptionDoc.exists) {
      console.log(`\n📦 Creating subscription document...`);
      await subscriptionRef.set({
        userId: user.uid,
        tier: 'premium', // Admins get premium by default
        status: 'active',
        aiTestsUsedToday: 0,
        aiTestDailyLimit: -1, // Unlimited for premium
        aiTestResetDate: new Date().toISOString(),
        startDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      console.log(`✅ Subscription created (Premium tier)`);
    } else {
      console.log(`ℹ️  Subscription already exists`);
    }

    // Display final status
    console.log(`\n✨ SUCCESS! Admin user created:\n`);
    console.log(`   Email:    ${user.email}`);
    console.log(`   UID:      ${user.uid}`);
    console.log(`   Role:     ${role === 'superAdmin' ? 'Super Admin' : 'Admin'}`);
    console.log(`   Tier:     Premium (Unlimited AI tests)`);
    console.log(`\n   Permissions:`);
    console.log(`   ✓ admin: ${customClaims.admin}`);
    console.log(`   ✓ superAdmin: ${customClaims.superAdmin}`);
    console.log(`   ✓ canDeleteUsers: ${customClaims.canDeleteUsers}`);
    console.log(`   ✓ canManageSubscriptions: ${customClaims.canManageSubscriptions}`);
    console.log(`\n⚠️  IMPORTANT: User must log out and log back in for claims to take effect!\n`);

    process.exit(0);
  } catch (error) {
    console.error(`\n❌ ERROR: ${error.message}`);
    
    if (error.code === 'auth/user-not-found') {
      console.error(`\n💡 User "${email}" not found. Please ensure:`);
      console.error(`   1. The user has signed up at http://localhost:3000/signup`);
      console.error(`   2. The email is spelled correctly`);
      console.error(`   3. The user exists in Firebase Authentication\n`);
    }
    
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error(`\n❌ ERROR: Email address required\n`);
  console.error(`Usage: node scripts/create-admin-user.js <email> [role]\n`);
  console.error(`Examples:`);
  console.error(`  node scripts/create-admin-user.js solo@solo.com superAdmin`);
  console.error(`  node scripts/create-admin-user.js admin@zentype.app admin\n`);
  process.exit(1);
}

const email = args[0];
const role = args[1] || 'admin'; // Default to 'admin' if not specified

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  console.error(`\n❌ ERROR: Invalid email format: ${email}\n`);
  process.exit(1);
}

// Validate role
if (role !== 'admin' && role !== 'superAdmin') {
  console.error(`\n❌ ERROR: Invalid role: ${role}`);
  console.error(`Valid roles: admin, superAdmin\n`);
  process.exit(1);
}

// Run the script
console.log(`\n🚀 ZenType Admin User Setup Script`);
console.log(`====================================\n`);
createAdminUser(email, role);
