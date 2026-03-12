/**
 * MockGateway.js
 * Simula la petición asíncrona a un servidor SOLR.
 * Implementa el patrón Repository/Adapter para facilitar el cambio a SOLR en el futuro.
 */

import activitiesData from '../mocks/activities.json' assert { type: 'json' };

export class MockGateway {
  /**
   * Simula una petición GET asíncrona para obtener todas las actividades.
   * @param {Object} params - Parámetros de la petición (para futuras extensiones)
   * @returns {Promise<Array>} Promise que resuelve con el array de actividades
   */
  static async fetchActivities(params = {}) {
    // Simular latencia de red (200-500ms)
    return new Promise((resolve) => {
      const delay = Math.random() * 300 + 200;
      setTimeout(() => {
        resolve([...activitiesData]);
      }, delay);
    });
  }

  /**
   * Obtiene una actividad específica por su ID.
   * @param {number} id - ID de la actividad
   * @returns {Promise<Object|null>} Promise que resuelve con la actividad o null si no existe
   */
  static async fetchActivityById(id) {
    return new Promise((resolve) => {
      const delay = Math.random() * 200 + 100;
      setTimeout(() => {
        const numId = typeof id === 'string' ? parseInt(id, 10) : id;
        const activity = activitiesData.find(a => a.id === numId);
        resolve(activity || null);
      }, delay);
    });
  }

   /**
    * Obtiene todos los centros cívicos únicos disponibles.
    * @returns {Promise<Array>} Promise que resuelve con array de centros únicos
    */
   static async fetchCenters() {
     return new Promise((resolve) => {
       const delay = Math.random() * 200 + 100;
       setTimeout(() => {
         const centersMap = new Map();
         activitiesData.forEach(activity => {
           if (!centersMap.has(activity.center)) {
             centersMap.set(activity.center, {
               id: activity.center,
               name: activity.centerName
             });
           }
         });
         resolve(Array.from(centersMap.values()));
       }, delay);
     });
   }

   /**
    * Simula la respuesta del endpoint /m01-10s/api/init.do
    * Retorna centros, actividades y serverTimestamp en una sola llamada.
    * @returns {Promise<Object>} Promise que resuelve con { centers, activities, serverTimestamp }
    */
   static async fetchInitData() {
     return new Promise((resolve) => {
       const delay = Math.random() * 300 + 200;
       setTimeout(() => {
         const centersMap = new Map();
         activitiesData.forEach(activity => {
           if (!centersMap.has(activity.center)) {
             centersMap.set(activity.center, {
               id: activity.center,
               name: activity.centerName
             });
           }
         });

         resolve({
           centers: Array.from(centersMap.values()),
           activities: [...activitiesData],
           serverTimestamp: new Date().toISOString()
         });
       }, delay);
     });
   }
 }
