Feature: Tenant-isolated knowledge
  Scenario: A member cannot search another tenant's document
    Given tenant Alpha owns a private document
    And an authenticated user belongs only to tenant Beta
    When the user searches a knowledge base in tenant Alpha
    Then no chunks from tenant Alpha are returned
    And an answer cites no restricted document

  Scenario: Private document is invisible within same tenant
    Given Alice and Bob belong to tenant Alpha
    And Alice uploads a private document
    When Bob searches that knowledge base
    Then Alice's private chunks are not present in the result
