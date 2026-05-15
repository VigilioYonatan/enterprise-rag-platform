<?php
declare(strict_types=1);
namespace Vigilio\Reference\Domain;

enum ProductStatus: string
{
    case Pending = 'pendiente';
    case Processed = 'procesado';
    case Cancelled = 'anulado';
}
