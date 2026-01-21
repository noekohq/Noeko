const { Surreal } = require('surrealdb');

async function main() {
    const db = new Surreal('http://127.0.0.1:8000/rpc');
    
    try {
        // Sign in as root user (credentials from docker-compose.yml)
        await db.signin({
            user: 'twig',
            pass: 'twig',
        });

        // Select the namespace and database
        await db.use('twig', 'twig');

        // Create a new user
        const user = await db.create('user', {
            email: 'admin@example.com',
            password: await db.query('crypto::argon2::generate($pass)', { pass: 'your_secure_password' }),
            firstName: 'Admin',
            lastName: 'User',
            settings: {},
            acceptedPrivacyPolicyAt: new Date(),
            acceptedTermsOfServiceAt: new Date(),
            role: 'superuser'
        });

        console.log('✅ User created successfully!');
        console.log('Email: admin@example.com');
        console.log('Password: your_secure_password');
    } catch (e) {
        console.error('Error creating user:', e);
    }
}

main();
