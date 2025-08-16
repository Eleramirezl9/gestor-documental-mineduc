import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { useTheme } from '../contexts/ThemeContext';

const ThemeSettings = () => {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          Apariencia del Sistema
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h4 className="text-sm font-medium">Tema de la interfaz</h4>
            <p className="text-sm text-muted-foreground">
              Personaliza la apariencia del sistema según tu preferencia
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={!isDark ? "default" : "outline"}
              size="sm"
              onClick={!isDark ? undefined : toggleTheme}
              className="gap-2"
            >
              <Sun className="h-4 w-4" />
              Claro
            </Button>
            <Button
              variant={isDark ? "default" : "outline"}
              size="sm"
              onClick={isDark ? undefined : toggleTheme}
              className="gap-2"
            >
              <Moon className="h-4 w-4" />
              Oscuro
            </Button>
          </div>
        </div>
        
        {/* Información del tema actual */}
        <div className="mt-4 p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2 text-sm">
            {isDark ? (
              <>
                <Moon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="font-medium">Modo Oscuro Activo</span>
              </>
            ) : (
              <>
                <Sun className="h-4 w-4 text-yellow-600" />
                <span className="font-medium">Modo Claro Activo</span>
              </>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {isDark 
              ? "Diseñado para reducir la fatiga visual en ambientes con poca luz"
              : "Diseño clásico optimizado para ambientes bien iluminados"
            }
          </p>
        </div>

        {/* Características del tema */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="space-y-2">
            <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Características
            </h5>
            <ul className="text-sm space-y-1">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full" />
                Colores institucionales
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                Alto contraste
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                Fácil lectura
              </li>
            </ul>
          </div>
          <div className="space-y-2">
            <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Beneficios
            </h5>
            <ul className="text-sm space-y-1">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full" />
                Menos fatiga visual
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full" />
                Mejor productividad
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-pink-500 rounded-full" />
                Experiencia moderna
              </li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ThemeSettings;