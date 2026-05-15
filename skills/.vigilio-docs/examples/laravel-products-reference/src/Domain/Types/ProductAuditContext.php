<?php
declare(strict_types=1);
namespace Vigilio\Reference\Domain\Types;

final readonly class ProductAuditContext
{
    public function __construct(
        public string $actorId,
        public \DateTimeImmutable $occurredAt,
    ) {}
}
