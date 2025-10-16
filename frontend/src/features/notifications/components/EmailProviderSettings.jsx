import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Switch } from '../../../components/ui/Switch';
import { Label } from '../../../components/ui/Label';
import { Mail, AlertCircle, RefreshCw, Send } from 'lucide-react';

export const EmailProviderSettings = ({
  provider = {
    name: 'resend',
    status: 'connected',
    usage: {
      used: 142,
      total: 3000,
      dailyUsed: 25,
      dailyLimit: 100,
      nextReset: '2 días'
    }
  },
  onVerify,
  onTestEmail,
  onViewLogs,
  isLoading
}) => {
  const [apiKey, setApiKey] = React.useState('');
  const [fromEmail, setFromEmail] = React.useState('notificaciones@mineduc.gob.gt');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Proveedor de Email
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Estado del Proveedor */}
          <div className="rounded-lg bg-gray-50 p-4">
            <h3 className="font-medium mb-2">Estado de {provider.name}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Estado:</p>
                <p className="font-medium flex items-center gap-1">
                  {provider.status === 'connected' ? (
                    <>
                      <span className="h-2 w-2 rounded-full bg-green-500"></span>
                      Conectado
                    </>
                  ) : (
                    <>
                      <span className="h-2 w-2 rounded-full bg-red-500"></span>
                      Desconectado
                    </>
                  )}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Plan:</p>
                <p className="font-medium">Gratis</p>
              </div>
              <div>
                <p className="text-gray-600">Emails usados:</p>
                <p className="font-medium">{provider.usage.used} / {provider.usage.total}</p>
              </div>
              <div>
                <p className="text-gray-600">Límite diario:</p>
                <p className="font-medium">{provider.usage.dailyUsed} / {provider.usage.dailyLimit}</p>
              </div>
              <div>
                <p className="text-gray-600">Próximo reset:</p>
                <p className="font-medium">{provider.usage.nextReset}</p>
              </div>
            </div>
          </div>

          {/* Configuración de API */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key de Resend</Label>
              <div className="flex gap-2">
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="re_••••••••••••••••"
                />
                <Button
                  variant="outline"
                  onClick={() => onVerify(apiKey)}
                  disabled={isLoading}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Verificar
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fromEmail">Email de origen</Label>
              <Input
                id="fromEmail"
                type="email"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Opciones Avanzadas */}
          <div className="space-y-4">
            <h3 className="font-medium">Opciones Avanzadas</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="fallback">Usar fallback automático a Gmail</Label>
                <Switch id="fallback" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="tracking">Tracking de aperturas</Label>
                <Switch id="tracking" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="clicks">Tracking de clicks</Label>
                <Switch id="clicks" defaultChecked />
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onViewLogs}>
              <AlertCircle className="h-4 w-4 mr-2" />
              Ver Logs
            </Button>
            <Button onClick={onTestEmail}>
              <Send className="h-4 w-4 mr-2" />
              Enviar Email de Prueba
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};