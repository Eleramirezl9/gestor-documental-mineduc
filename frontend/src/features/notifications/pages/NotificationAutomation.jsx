import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../components/ui/Tabs';
import { SystemStatus } from '../components/SystemStatus';
import { EmailComposer } from '../components/EmailComposer';
import { EmailLogs } from '../components/EmailLogs';
import { useNotificationAutomation } from '../hooks/useNotificationAutomation';

export const NotificationAutomation = () => {
  const {
    systemStatus,
    handleToggleService,
    handleRefreshStatus,
    handleGenerateMessage,
    handlePreviewMessage,
    handleSendTest,
    handleRefreshLogs,
    handleExportLogs,
    isLoading,
    logs
  } = useNotificationAutomation();

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">
        🤖 Automatización de Notificaciones
      </h1>
      
      <p className="text-gray-500">
        Sistema inteligente de notificaciones automáticas con IA
      </p>

      <SystemStatus 
        status={{
          ...systemStatus,
          onToggleService: handleToggleService,
          onRefresh: handleRefreshStatus
        }}
      />

      <Tabs defaultValue="composer" className="w-full">
        <TabsList>
          <TabsTrigger value="composer">🪄 Compositor IA</TabsTrigger>
          <TabsTrigger value="automation">⚙️ Automatización</TabsTrigger>
          <TabsTrigger value="testing">📤 Pruebas</TabsTrigger>
          <TabsTrigger value="monitoring">📊 Monitoreo</TabsTrigger>
        </TabsList>

        <TabsContent value="composer" className="mt-6">
          <EmailComposer
            onGenerateMessage={handleGenerateMessage}
            onPreview={handlePreviewMessage}
            onSendTest={handleSendTest}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="monitoring" className="mt-6">
          <EmailLogs 
            logs={logs}
            onRefresh={handleRefreshLogs}
            onExport={handleExportLogs}
          />
        </TabsContent>

        {/* Implementar otros tabs según sea necesario */}
      </Tabs>
    </div>
  );
};