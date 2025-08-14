#!/bin/bash

# 🧪 Script de Pruebas Automatizadas para API MINEDUC
# Este script ejecuta una serie de pruebas para validar el funcionamiento de la API

set -e  # Salir en caso de error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
API_BASE="http://localhost:5000"
TEST_EMAIL="admin@mineduc.gob.gt"
TEST_PASSWORD="admin123"
TOKEN=""
DOCUMENT_ID=""
USER_ID=""
WORKFLOW_ID=""

# Función para imprimir mensajes
print_step() {
    echo -e "${BLUE}🔄 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Función para verificar respuesta HTTP
check_response() {
    local response_code=$1
    local expected_code=$2
    local step_name=$3
    
    if [ "$response_code" -eq "$expected_code" ]; then
        print_success "$step_name - Código: $response_code"
        return 0
    else
        print_error "$step_name - Esperado: $expected_code, Recibido: $response_code"
        return 1
    fi
}

# Verificar que el servidor esté corriendo
print_step "Verificando que el servidor esté corriendo..."
if curl -s --fail "$API_BASE/health" > /dev/null; then
    print_success "Servidor está ejecutándose"
else
    print_error "El servidor no está disponible en $API_BASE"
    exit 1
fi

echo -e "\n${BLUE}🚀 Iniciando pruebas de API MINEDUC${NC}\n"

# 1. PRUEBAS DE AUTENTICACIÓN
echo -e "${BLUE}============== 🔐 PRUEBAS DE AUTENTICACIÓN ==============${NC}"

print_step "1.1 - Probando login de administrador..."
LOGIN_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

HTTP_STATUS=$(echo $LOGIN_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
LOGIN_BODY=$(echo $LOGIN_RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if check_response $HTTP_STATUS 200 "Login de administrador"; then
    TOKEN=$(echo $LOGIN_BODY | jq -r '.session.access_token')
    if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
        print_success "Token obtenido: ${TOKEN:0:20}..."
    else
        print_error "No se pudo obtener el token"
        exit 1
    fi
else
    print_error "Falló el login: $LOGIN_BODY"
    exit 1
fi

print_step "1.2 - Probando obtener perfil de usuario..."
PROFILE_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X GET "$API_BASE/api/auth/profile" \
  -H "Authorization: Bearer $TOKEN")

HTTP_STATUS=$(echo $PROFILE_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
check_response $HTTP_STATUS 200 "Obtener perfil"

# 2. PRUEBAS DE HEALTH CHECK
echo -e "\n${BLUE}============== 🔄 HEALTH CHECK ==============${NC}"

print_step "2.1 - Probando health check..."
HEALTH_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X GET "$API_BASE/health")

HTTP_STATUS=$(echo $HEALTH_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
check_response $HTTP_STATUS 200 "Health check"

# 3. PRUEBAS DE DOCUMENTOS
echo -e "\n${BLUE}============== 📄 PRUEBAS DE DOCUMENTOS ==============${NC}"

print_step "3.1 - Probando creación de documento..."
DOC_CREATE_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST "$API_BASE/api/documents" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Documento de Prueba Automatizada",
    "description": "Este documento fue creado automáticamente por el script de pruebas",
    "isPublic": false,
    "tags": ["test", "automatizado", "script"]
  }')

HTTP_STATUS=$(echo $DOC_CREATE_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
DOC_CREATE_BODY=$(echo $DOC_CREATE_RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if check_response $HTTP_STATUS 201 "Crear documento"; then
    DOCUMENT_ID=$(echo $DOC_CREATE_BODY | jq -r '.document.id')
    print_success "Documento creado con ID: $DOCUMENT_ID"
else
    print_error "Error creando documento: $DOC_CREATE_BODY"
fi

print_step "3.2 - Probando obtener documento por ID..."
if [ -n "$DOCUMENT_ID" ] && [ "$DOCUMENT_ID" != "null" ]; then
    DOC_GET_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X GET "$API_BASE/api/documents/$DOCUMENT_ID" \
      -H "Authorization: Bearer $TOKEN")

    HTTP_STATUS=$(echo $DOC_GET_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    check_response $HTTP_STATUS 200 "Obtener documento por ID"
else
    print_warning "Saltando prueba: no hay DOCUMENT_ID válido"
fi

print_step "3.3 - Probando listar documentos..."
DOC_LIST_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X GET "$API_BASE/api/documents?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN")

HTTP_STATUS=$(echo $DOC_LIST_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
check_response $HTTP_STATUS 200 "Listar documentos"

print_step "3.4 - Probando estadísticas de documentos..."
DOC_STATS_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X GET "$API_BASE/api/documents/stats/overview" \
  -H "Authorization: Bearer $TOKEN")

HTTP_STATUS=$(echo $DOC_STATS_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
check_response $HTTP_STATUS 200 "Estadísticas de documentos"

# 4. PRUEBAS DE USUARIOS
echo -e "\n${BLUE}============== 👥 PRUEBAS DE USUARIOS ==============${NC}"

print_step "4.1 - Probando listar usuarios (admin)..."
USER_LIST_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X GET "$API_BASE/api/users?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN")

HTTP_STATUS=$(echo $USER_LIST_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
check_response $HTTP_STATUS 200 "Listar usuarios"

print_step "4.2 - Probando estadísticas de usuarios..."
USER_STATS_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X GET "$API_BASE/api/users/stats/overview" \
  -H "Authorization: Bearer $TOKEN")

HTTP_STATUS=$(echo $USER_STATS_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
check_response $HTTP_STATUS 200 "Estadísticas de usuarios"

# 5. PRUEBAS DE WORKFLOWS
echo -e "\n${BLUE}============== 🔄 PRUEBAS DE WORKFLOWS ==============${NC}"

print_step "5.1 - Probando listar workflows..."
WORKFLOW_LIST_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X GET "$API_BASE/api/workflows" \
  -H "Authorization: Bearer $TOKEN")

HTTP_STATUS=$(echo $WORKFLOW_LIST_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
check_response $HTTP_STATUS 200 "Listar workflows"

print_step "5.2 - Probando estadísticas de workflows..."
WORKFLOW_STATS_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X GET "$API_BASE/api/workflows/stats/overview" \
  -H "Authorization: Bearer $TOKEN")

HTTP_STATUS=$(echo $WORKFLOW_STATS_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
check_response $HTTP_STATUS 200 "Estadísticas de workflows"

# 6. PRUEBAS DE NOTIFICACIONES
echo -e "\n${BLUE}============== 🔔 PRUEBAS DE NOTIFICACIONES ==============${NC}"

print_step "6.1 - Probando listar notificaciones..."
NOTIF_LIST_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X GET "$API_BASE/api/notifications" \
  -H "Authorization: Bearer $TOKEN")

HTTP_STATUS=$(echo $NOTIF_LIST_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
check_response $HTTP_STATUS 200 "Listar notificaciones"

print_step "6.2 - Probando conteo de notificaciones no leídas..."
NOTIF_COUNT_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X GET "$API_BASE/api/notifications/unread-count" \
  -H "Authorization: Bearer $TOKEN")

HTTP_STATUS=$(echo $NOTIF_COUNT_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
check_response $HTTP_STATUS 200 "Conteo de no leídas"

# 7. PRUEBAS DE REPORTES
echo -e "\n${BLUE}============== 📊 PRUEBAS DE REPORTES ==============${NC}"

print_step "7.1 - Probando reporte de documentos..."
REPORT_DOCS_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X GET "$API_BASE/api/reports/documents" \
  -H "Authorization: Bearer $TOKEN")

HTTP_STATUS=$(echo $REPORT_DOCS_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
check_response $HTTP_STATUS 200 "Reporte de documentos"

print_step "7.2 - Probando reporte de actividad de usuarios..."
REPORT_ACTIVITY_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X GET "$API_BASE/api/reports/user-activity" \
  -H "Authorization: Bearer $TOKEN")

HTTP_STATUS=$(echo $REPORT_ACTIVITY_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
check_response $HTTP_STATUS 200 "Reporte de actividad"

# 8. PRUEBAS DE AUDITORÍA
echo -e "\n${BLUE}============== 🔍 PRUEBAS DE AUDITORÍA ==============${NC}"

print_step "8.1 - Probando logs de auditoría..."
AUDIT_LOGS_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X GET "$API_BASE/api/audit?page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN")

HTTP_STATUS=$(echo $AUDIT_LOGS_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
check_response $HTTP_STATUS 200 "Logs de auditoría"

print_step "8.2 - Probando estadísticas de auditoría..."
AUDIT_STATS_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X GET "$API_BASE/api/audit/stats" \
  -H "Authorization: Bearer $TOKEN")

HTTP_STATUS=$(echo $AUDIT_STATS_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
check_response $HTTP_STATUS 200 "Estadísticas de auditoría"

print_step "8.3 - Probando actividad reciente..."
AUDIT_RECENT_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X GET "$API_BASE/api/audit/activity/recent" \
  -H "Authorization: Bearer $TOKEN")

HTTP_STATUS=$(echo $AUDIT_RECENT_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
check_response $HTTP_STATUS 200 "Actividad reciente"

# RESUMEN FINAL
echo -e "\n${BLUE}============== 📋 RESUMEN DE PRUEBAS ==============${NC}"

print_success "¡Todas las pruebas completadas!"
echo -e "\n${GREEN}✅ Endpoints principales probados:${NC}"
echo "   - Autenticación (login, perfil)"
echo "   - Health check"
echo "   - Documentos (crear, listar, estadísticas)"
echo "   - Usuarios (listar, estadísticas)"
echo "   - Workflows (listar, estadísticas)"
echo "   - Notificaciones (listar, conteo)"
echo "   - Reportes (documentos, actividad)"
echo "   - Auditoría (logs, estadísticas, actividad reciente)"

echo -e "\n${BLUE}📊 Información generada en las pruebas:${NC}"
if [ -n "$DOCUMENT_ID" ] && [ "$DOCUMENT_ID" != "null" ]; then
    echo "   - Documento creado: $DOCUMENT_ID"
fi
echo "   - Token de sesión: ${TOKEN:0:20}..."

echo -e "\n${YELLOW}💡 Para más pruebas detalladas:${NC}"
echo "   - Abre Swagger UI: http://localhost:5000/api-docs"
echo "   - Importa la colección Postman: ./docs/postman_collection.json"
echo "   - Revisa los ejemplos: ./docs/API_TESTING_EXAMPLES.md"

echo -e "\n${GREEN}🎉 ¡API MINEDUC está funcionando correctamente!${NC}"