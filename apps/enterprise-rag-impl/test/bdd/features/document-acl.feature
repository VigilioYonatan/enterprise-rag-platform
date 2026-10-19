@postgres @security
Feature: Authorized enterprise retrieval across tenant and document boundaries
  Role-based membership alone must not expose a private document.

  Scenario: Same tenant without grant cannot read private chunks
    Given an isolated tenant with an owner, a peer and a private document
    When the peer queries the private document as the restricted database role
    Then no private chunks are returned

  Scenario: Same tenant reader with grant can read private chunks
    Given an isolated tenant with an owner, a peer and a private document
    And the owner grants the peer permission on the document
    When the peer queries the private document as the restricted database role
    Then exactly one private chunk is returned

  Scenario: Revocation removes the granted reader immediately
    Given an isolated tenant with an owner, a peer and a private document
    And the owner grants the peer permission on the document
    And the owner revokes the peer permission on the document
    When the peer queries the private document as the restricted database role
    Then no private chunks are returned

  Scenario: Membership in another tenant never provides private content
    Given an isolated tenant with an owner, a peer and a private document
    When an outsider queries the private document as the restricted database role
    Then no private chunks are returned

  Scenario: A document group grant allows an enrolled member
    Given an isolated tenant with an owner, a peer and a private document
    And the owner grants the private document to a group containing the peer
    When the peer queries the private document as the restricted database role
    Then exactly one private chunk is returned

  Scenario: Removing a user from a granted group immediately revokes access
    Given an isolated tenant with an owner, a peer and a private document
    And the owner grants the private document to a group containing the peer
    And the peer is removed from the granted group
    When the peer queries the private document as the restricted database role
    Then no private chunks are returned
