import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../components/ui/Tabs';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../components/ui/Select';
import { Mail, Send, FileText, BarChart } from 'lucide-react';

export const EmailComposer = ({
  onGenerateMessage,
  onPreview,
  onSendTest,
  isLoading
}) => {
  const [messageType, setMessageType] = React.useState('welcome');
  const [recipient, setRecipient] = React.useState('');
  const [messageStyle, setMessageStyle] = React.useState('professional');

  const messageTypes = [
    { value: 'welcome', label: 'Bienvenida' },
    { value: 'document_expiry', label: 'Vencimiento de Documento' },
    { value: 'reminder', label: 'Recordatorio' },
    { value: 'organizational_change', label: 'Cambio Organizacional' }
  ];

  const messageStyles = [
    { value: 'professional', label: 'Profesional' },
    { value: 'friendly', label: 'Amigable' },
    { value: 'urgent', label: 'Urgente' },
    { value: 'concise', label: 'Conciso' }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Compositor de Mensajes con IA
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select value={messageType} onValueChange={setMessageType}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo de mensaje" />
              </SelectTrigger>
              <SelectContent>
                {messageTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={messageStyle} onValueChange={setMessageStyle}>
              <SelectTrigger>
                <SelectValue placeholder="Estilo del mensaje" />
              </SelectTrigger>
              <SelectContent>
                {messageStyles.map(style => (
                  <SelectItem key={style.value} value={style.value}>
                    {style.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Input
            placeholder="Email de prueba (opcional)"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            type="email"
          />

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => onPreview({ messageType, messageStyle })}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Vista Previa
            </Button>

            <Button
              onClick={() => onGenerateMessage({ messageType, messageStyle })}
              className="flex items-center gap-2"
              disabled={isLoading}
            >
              <BarChart className="h-4 w-4" />
              Generar con IA
            </Button>

            {recipient && (
              <Button
                onClick={() => onSendTest({ messageType, messageStyle, recipient })}
                className="flex items-center gap-2"
                disabled={isLoading}
              >
                <Send className="h-4 w-4" />
                Enviar Prueba
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};