import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Mail, AlertTriangle, Check, X } from 'lucide-react';

export const SystemStatus = ({ status }) => {
  const getStatusCard = (title, isActive, icon, details = '') => (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-gray-700">{title}</span>
        {isActive ? (
          <Check className="h-5 w-5 text-green-500" />
        ) : (
          <X className="h-5 w-5 text-red-500" />
        )}
      </div>
      <div className="text-sm text-gray-500">{details}</div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Estado del Sistema
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {getStatusCard('Servicio', status.serviceActive, Check, 
            status.serviceActive ? 'Funcionando' : 'Detenido')}
          
          {getStatusCard('IA', status.aiAvailable, Check,
            status.aiProvider)}
          
          {getStatusCard('Email', status.emailConfigured, Mail,
            status.emailProvider)}
          
          {getStatusCard('Procesos', status.processCount > 0, AlertTriangle,
            `${status.processCount} activos`)}
        </div>

        <div className="mt-4 flex justify-end space-x-2">
          <Button 
            variant="outline"
            onClick={status.onRefresh}
            className="flex items-center gap-2"
          >
            Actualizar
          </Button>
          <Button
            variant={status.serviceActive ? "destructive" : "default"}
            onClick={status.onToggleService}
            className="flex items-center gap-2"
          >
            {status.serviceActive ? '⏸️ Detener Servicio' : '▶️ Iniciar Servicio'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};