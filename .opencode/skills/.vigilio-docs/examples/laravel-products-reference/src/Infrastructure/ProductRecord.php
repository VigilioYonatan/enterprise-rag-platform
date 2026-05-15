<?php
declare(strict_types=1);
namespace Vigilio\Reference\Infrastructure;

use Illuminate\Database\Eloquent\Model;

final class ProductRecord extends Model
{
    protected $table = 'products';
    protected $guarded = ['id', 'tenant_id'];
    public $timestamps = false;
}
