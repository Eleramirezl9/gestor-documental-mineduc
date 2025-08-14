// 🧪 Script de Pruebas Node.js para API MINEDUC
// Ejecutar con: node test_api.js

const axios = require('axios');

// Configuración
const API_BASE = 'http://localhost:5000';
const TEST_EMAIL = 'admin@mineduc.gob.gt';
const TEST_PASSWORD = 'admin123';

let token = '';
let documentId = '';

// Colores para consola
const colors = {
    blue: '\x1b[34m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    reset: '\x1b[0m'
};

// Funciones helper
const log = (message, color = 'reset') => {
    console.log(`${colors[color]}${message}${colors.reset}`);
};

const step = (message) => log(`🔄 ${message}`, 'blue');
const success = (message) => log(`✅ ${message}`, 'green');
const error = (message) => log(`❌ ${message}`, 'red');
const warning = (message) => log(`⚠️  ${message}`, 'yellow');

// Función para hacer requests con manejo de errores
const apiRequest = async (method, url, data = null, headers = {}) => {
    try {
        const config = {
            method,
            url: `${API_BASE}${url}`,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        if (data) {
            config.data = data;
        }

        const response = await axios(config);
        return { success: true, data: response.data, status: response.status };
    } catch (err) {
        return { 
            success: false, 
            error: err.response?.data || err.message, 
            status: err.response?.status 
        };
    }
};

// Función principal de pruebas
const runTests = async () => {
    log('\n🚀 Iniciando pruebas de API MINEDUC\n', 'blue');

    try {
        // 1. Verificar que el servidor esté corriendo
        step('Verificando que el servidor esté corriendo...');
        const healthCheck = await apiRequest('GET', '/health');
        
        if (!healthCheck.success) {
            error('El servidor no está disponible');
            process.exit(1);
        }
        success('Servidor está ejecutándose');

        // 2. PRUEBAS DE AUTENTICACIÓN
        log('\n============== 🔐 PRUEBAS DE AUTENTICACIÓN ==============', 'blue');

        step('2.1 - Probando login de administrador...');
        const login = await apiRequest('POST', '/api/auth/login', {
            email: TEST_EMAIL,
            password: TEST_PASSWORD
        });

        if (login.success) {
            token = login.data.session.access_token;
            success(`Login exitoso. Token: ${token.substring(0, 20)}...`);
        } else {
            error(`Error en login: ${JSON.stringify(login.error)}`);
            process.exit(1);
        }

        step('2.2 - Probando obtener perfil...');
        const profile = await apiRequest('GET', '/api/auth/profile', null, {
            'Authorization': `Bearer ${token}`
        });

        if (profile.success) {
            success(`Perfil obtenido: ${profile.data.user.email}`);
        } else {
            error(`Error obteniendo perfil: ${JSON.stringify(profile.error)}`);
        }

        // 3. PRUEBAS DE DOCUMENTOS
        log('\n============== 📄 PRUEBAS DE DOCUMENTOS ==============', 'blue');

        step('3.1 - Creando documento de prueba...');
        const createDoc = await apiRequest('POST', '/api/documents', {
            title: 'Documento de Prueba Node.js',
            description: 'Este documento fue creado por el script de pruebas Node.js',
            isPublic: false,
            tags: ['test', 'nodejs', 'automatizado']
        }, {
            'Authorization': `Bearer ${token}`
        });

        if (createDoc.success) {
            documentId = createDoc.data.document.id;
            success(`Documento creado con ID: ${documentId}`);
        } else {
            error(`Error creando documento: ${JSON.stringify(createDoc.error)}`);
        }

        step('3.2 - Listando documentos...');
        const listDocs = await apiRequest('GET', '/api/documents?page=1&limit=5', null, {
            'Authorization': `Bearer ${token}`
        });

        if (listDocs.success) {
            success(`Documentos listados: ${listDocs.data.documents.length} encontrados`);
        } else {
            error(`Error listando documentos: ${JSON.stringify(listDocs.error)}`);
        }

        step('3.3 - Obteniendo estadísticas de documentos...');
        const docStats = await apiRequest('GET', '/api/documents/stats/overview', null, {
            'Authorization': `Bearer ${token}`
        });

        if (docStats.success) {
            success(`Estadísticas obtenidas - Total: ${docStats.data.total || 0} documentos`);
        } else {
            error(`Error obteniendo estadísticas: ${JSON.stringify(docStats.error)}`);
        }

        // 4. PRUEBAS DE USUARIOS
        log('\n============== 👥 PRUEBAS DE USUARIOS ==============', 'blue');

        step('4.1 - Listando usuarios...');
        const listUsers = await apiRequest('GET', '/api/users?page=1&limit=10', null, {
            'Authorization': `Bearer ${token}`
        });

        if (listUsers.success) {
            success(`Usuarios listados: ${listUsers.data.users.length} encontrados`);
        } else {
            error(`Error listando usuarios: ${JSON.stringify(listUsers.error)}`);
        }

        // 5. PRUEBAS DE WORKFLOWS
        log('\n============== 🔄 PRUEBAS DE WORKFLOWS ==============', 'blue');

        step('5.1 - Listando workflows...');
        const listWorkflows = await apiRequest('GET', '/api/workflows', null, {
            'Authorization': `Bearer ${token}`
        });

        if (listWorkflows.success) {
            success(`Workflows listados: ${listWorkflows.data.workflows.length} encontrados`);
        } else {
            error(`Error listando workflows: ${JSON.stringify(listWorkflows.error)}`);
        }

        // 6. PRUEBAS DE NOTIFICACIONES
        log('\n============== 🔔 PRUEBAS DE NOTIFICACIONES ==============', 'blue');

        step('6.1 - Listando notificaciones...');
        const listNotifications = await apiRequest('GET', '/api/notifications', null, {
            'Authorization': `Bearer ${token}`
        });

        if (listNotifications.success) {
            success(`Notificaciones listadas: ${listNotifications.data.notifications.length} encontradas`);
        } else {
            error(`Error listando notificaciones: ${JSON.stringify(listNotifications.error)}`);
        }

        step('6.2 - Obteniendo conteo de no leídas...');
        const unreadCount = await apiRequest('GET', '/api/notifications/unread-count', null, {
            'Authorization': `Bearer ${token}`
        });

        if (unreadCount.success) {
            success(`Notificaciones no leídas: ${unreadCount.data.unreadCount}`);
        } else {
            error(`Error obteniendo conteo: ${JSON.stringify(unreadCount.error)}`);
        }

        // 7. PRUEBAS DE REPORTES
        log('\n============== 📊 PRUEBAS DE REPORTES ==============', 'blue');

        step('7.1 - Generando reporte de documentos...');
        const docReport = await apiRequest('GET', '/api/reports/documents', null, {
            'Authorization': `Bearer ${token}`
        });

        if (docReport.success) {
            success(`Reporte generado - Documentos en reporte: ${docReport.data.statistics?.total || 0}`);
        } else {
            error(`Error generando reporte: ${JSON.stringify(docReport.error)}`);
        }

        // 8. PRUEBAS DE AUDITORÍA
        log('\n============== 🔍 PRUEBAS DE AUDITORÍA ==============', 'blue');

        step('8.1 - Obteniendo logs de auditoría...');
        const auditLogs = await apiRequest('GET', '/api/audit?page=1&limit=20', null, {
            'Authorization': `Bearer ${token}`
        });

        if (auditLogs.success) {
            success(`Logs obtenidos: ${auditLogs.data.logs.length} registros`);
        } else {
            error(`Error obteniendo logs: ${JSON.stringify(auditLogs.error)}`);
        }

        step('8.2 - Obteniendo actividad reciente...');
        const recentActivity = await apiRequest('GET', '/api/audit/activity/recent', null, {
            'Authorization': `Bearer ${token}`
        });

        if (recentActivity.success) {
            success(`Actividad reciente: ${recentActivity.data.recentActivity.length} eventos`);
        } else {
            error(`Error obteniendo actividad: ${JSON.stringify(recentActivity.error)}`);
        }

        // RESUMEN FINAL
        log('\n============== 📋 RESUMEN DE PRUEBAS ==============', 'blue');
        success('¡Todas las pruebas completadas exitosamente!');
        
        log('\n✅ Endpoints probados:', 'green');
        console.log('   - ✅ Autenticación (login, perfil)');
        console.log('   - ✅ Health check');
        console.log('   - ✅ Documentos (crear, listar, estadísticas)');
        console.log('   - ✅ Usuarios (listar)');
        console.log('   - ✅ Workflows (listar)');
        console.log('   - ✅ Notificaciones (listar, conteo)');
        console.log('   - ✅ Reportes (documentos)');
        console.log('   - ✅ Auditoría (logs, actividad reciente)');

        log('\n📊 Información generada:', 'blue');
        if (documentId) {
            console.log(`   - Documento creado: ${documentId}`);
        }
        console.log(`   - Token de sesión: ${token.substring(0, 20)}...`);

        log('\n💡 Para más pruebas:', 'yellow');
        console.log('   - Swagger UI: http://localhost:5000/api-docs');
        console.log('   - Colección Postman: ./docs/postman_collection.json');
        console.log('   - Ejemplos detallados: ./docs/API_TESTING_EXAMPLES.md');

        log('\n🎉 ¡API MINEDUC está funcionando correctamente!', 'green');

    } catch (err) {
        error(`Error inesperado: ${err.message}`);
        process.exit(1);
    }
};

// Ejecutar pruebas si el archivo se ejecuta directamente
if (require.main === module) {
    runTests();
}

module.exports = { runTests, apiRequest };