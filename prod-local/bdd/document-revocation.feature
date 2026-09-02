Feature: Revocación documental durante recuperación y generación
  Scenario: Un lector del tenant no puede recuperar documentos privados sin grant
    Given la organización contiene un documento privado del propietario
    And el lector pertenece a esa misma organización
    And el lector no tiene ningún grant del documento
    When el lector realiza una búsqueda que coincide con su contenido
    Then la respuesta de retrieval no contiene el fragmento privado
    And no existe una cita resoluble a ese fragmento

  Scenario: Una revocación invalida la cita
    Given un lector tiene grant de lectura a un documento privado
    And una conversación anterior contiene una cita a ese documento
    When el propietario revoca el grant del lector
    Then el lector recibe 404 al resolver la cita anterior
    And el documento ya no aparece en retrieval autorizado

  Scenario: Un usuario de otro tenant nunca ve contenido privado
    Given un documento privado pertenece al tenant A
    When un usuario del tenant B intenta leer el documento
    Then la API responde 404 o 403
    And los fragmentos del tenant A no aparecen en la búsqueda del tenant B
