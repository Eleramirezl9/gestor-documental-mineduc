import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Upload, FileText, CheckCircle, Clock, MessageSquare, Send, X } from 'lucide-react';

export default function EmployeePortal() {
  const { token } = useParams();

  const [validating, setValidating] = useState(true);
  const [employee, setEmployee] = useState(null);
  const [documents, setDocuments] = useState({ requested: [], submitted: [] });
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadRequestId, setUploadRequestId] = useState(null);
  const [message, setMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messages, setMessages] = useState([]);
  const [showMessageForm, setShowMessageForm] = useState(false);

  useEffect(() => {
    validateTokenAndLoadData();
  }, [token]);

  const validateTokenAndLoadData = async () => {
    try {
      setValidating(true);

      // Validar token
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/employee-portal/validate/${token}`);
      const data = await response.json();

      if (!data.success) {
        alert('Enlace inválido o expirado. Por favor, contacte al administrador.');
        return;
      }

      setEmployee(data.employee);

      // Cargar documentos
      await loadDocuments();

      // Cargar mensajes
      await loadMessages();

    } catch (error) {
      console.error('Error validating token:', error);
      alert('Error al validar el enlace. Por favor, intente de nuevo más tarde.');
    } finally {
      setValidating(false);
    }
  };

  const loadDocuments = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/employee-portal/${token}/documents`);
      const data = await response.json();

      if (data.success) {
        setDocuments(data.data);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/employee-portal/${token}/messages`);
      const data = await response.json();

      if (data.success) {
        setMessages(data.data);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.size > 10 * 1024 * 1024) {
      alert('El archivo no debe superar los 10MB');
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = async (requestId = null, documentType = 'Otros') => {
    if (!selectedFile) {
      alert('Por favor seleccione un archivo');
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('documentType', documentType);
      if (requestId) {
        formData.append('requestId', requestId);
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/employee-portal/${token}/upload`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        alert('Documento subido exitosamente');
        setSelectedFile(null);
        setUploadRequestId(null);
        await loadDocuments();
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Error al subir el documento. Por favor, intente de nuevo.');
    } finally {
      setUploading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) {
      alert('Por favor escriba un mensaje');
      return;
    }

    try {
      setSendingMessage(true);

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/employee-portal/${token}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim() })
      });

      const data = await response.json();

      if (data.success) {
        alert('Mensaje enviado al administrador');
        setMessage('');
        setShowMessageForm(false);
        await loadMessages();
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error al enviar el mensaje. Por favor, intente de nuevo.');
    } finally {
      setSendingMessage(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      submitted: 'bg-green-100 text-green-800 border-green-200',
      approved: 'bg-blue-100 text-blue-800 border-blue-200',
      rejected: 'bg-red-100 text-red-800 border-red-200'
    };

    const labels = {
      pending: 'Pendiente',
      submitted: 'Enviado',
      approved: 'Aprobado',
      rejected: 'Rechazado'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800'
    };

    const labels = {
      high: 'Alta',
      medium: 'Normal',
      low: 'Baja'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${styles[priority] || styles.medium}`}>
        {labels[priority] || priority}
      </span>
    );
  };

  if (validating) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Validando acceso...</p>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg max-w-md">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h1>
          <p className="text-gray-600 mb-6">
            El enlace es inválido o ha expirado. Por favor, contacte al administrador para solicitar un nuevo enlace.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-8 px-4 shadow-lg">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Portal del Empleado</h1>
          <p className="text-blue-100">Ministerio de Educación - Guatemala</p>
          <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <p className="text-lg">
              <strong>Bienvenido/a:</strong> {employee.name}
            </p>
            <p className="text-sm text-blue-100">
              {employee.email} • {employee.department}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Documentos Solicitados */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-6 h-6 text-orange-600" />
            <h2 className="text-2xl font-bold text-gray-900">Documentos Solicitados</h2>
          </div>

          {documents.requested.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No hay documentos pendientes por entregar
            </p>
          ) : (
            <div className="space-y-4">
              {documents.requested.map((request) => (
                <div key={request.id} className="border rounded-lg p-4 hover:border-blue-500 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-gray-900">{request.document_type}</h3>
                      {request.notes && (
                        <p className="text-sm text-gray-600 mt-1">{request.notes}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {getPriorityBadge(request.priority)}
                      {getStatusBadge(request.status)}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Fecha límite: {request.required_date ? new Date(request.required_date).toLocaleDateString('es-ES') : 'No especificada'}
                    </span>
                  </div>

                  {request.status === 'pending' && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex gap-3 items-center">
                        <input
                          type="file"
                          onChange={(e) => {
                            handleFileSelect(e);
                            setUploadRequestId(request.id);
                          }}
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        <button
                          onClick={() => handleUpload(request.id, request.document_type)}
                          disabled={!selectedFile || uploading || uploadRequestId !== request.id}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                        >
                          {uploading && uploadRequestId === request.id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Subiendo...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4" />
                              Subir
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {request.status === 'submitted' && request.documents && (
                    <div className="mt-4 pt-4 border-t bg-green-50 rounded p-3">
                      <div className="flex items-center gap-2 text-green-800">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-medium">Documento enviado:</span>
                        <span>{request.documents.filename}</span>
                        <span className="text-sm text-green-600">
                          ({new Date(request.documents.uploaded_at).toLocaleDateString('es-ES')})
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Documentos Enviados */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-6">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <h2 className="text-2xl font-bold text-gray-900">Documentos Enviados</h2>
          </div>

          {documents.submitted.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No ha enviado ningún documento aún
            </p>
          ) : (
            <div className="space-y-3">
              {documents.submitted.map((doc) => (
                <div key={doc.id} className="border rounded-lg p-4 flex items-center justify-between hover:border-green-500 transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div>
                      <h3 className="font-medium text-gray-900">{doc.file_name}</h3>
                      <p className="text-sm text-gray-500">
                        {doc.document_types?.name || 'Sin categoría'} • {new Date(doc.upload_date).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(doc.status)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mensajes al Administrador */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">Mensajes</h2>
            </div>
            <button
              onClick={() => setShowMessageForm(!showMessageForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              {showMessageForm ? (
                <>
                  <X className="w-4 h-4" />
                  Cancelar
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Nuevo Mensaje
                </>
              )}
            </button>
          </div>

          {showMessageForm && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Escriba su mensaje al administrador..."
                rows="4"
                maxLength="2000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <div className="flex justify-between items-center mt-3">
                <span className="text-sm text-gray-500">
                  {message.length}/2000 caracteres
                </span>
                <button
                  onClick={handleSendMessage}
                  disabled={sendingMessage || !message.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {sendingMessage ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Enviar Mensaje
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {messages.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No hay mensajes aún
              </p>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-gray-900">{msg.message}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(msg.created_at).toLocaleString('es-ES')}
                      </p>
                    </div>
                    {msg.read_at && (
                      <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                        Leído
                      </span>
                    )}
                  </div>
                  {msg.response && (
                    <div className="mt-3 pt-3 border-t bg-blue-50 rounded p-3">
                      <p className="text-sm font-medium text-blue-900 mb-1">Respuesta del Administrador:</p>
                      <p className="text-sm text-blue-800">{msg.response}</p>
                      <p className="text-xs text-blue-600 mt-1">
                        {new Date(msg.responded_at).toLocaleString('es-ES')}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-sm text-blue-900">
          <h3 className="font-semibold mb-3">ℹ️ Información Importante:</h3>
          <ul className="space-y-2 list-disc list-inside">
            <li>Los archivos deben ser PDF, DOC, DOCX, JPG o PNG</li>
            <li>Tamaño máximo: 10 MB por archivo</li>
            <li>Este enlace es personal y válido por 30 días</li>
            <li>Si tiene problemas, use el formulario de mensajes para contactar al administrador</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
