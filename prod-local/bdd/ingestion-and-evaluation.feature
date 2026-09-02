Feature: Procesamiento y evaluación reproducible
  Scenario: Archivo malicioso rechazado
    Given ClamAV está configurado con bloqueo de ingesta
    When el propietario sube un archivo infectado
    Then el trabajo termina failed sin indexar fragmentos
    And ninguna búsqueda devuelve contenido del archivo

  Scenario: Evaluación lexical autorizada
    Given existen documentos indexados y un dataset con ground truth
    When el propietario ejecuta el dataset de evaluación
    Then la ejecución incluye Recall@6 y MRR@6 calculados
    And se conservan los resultados por pregunta en PostgreSQL
