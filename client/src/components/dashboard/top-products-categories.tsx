import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, Package, FolderTree } from "lucide-react";
import { authenticatedFetch } from "@/lib/api";

interface TopProductsCategoriesProps {
  dateFrom: string;
  dateTo: string;
  shouldFetch?: boolean;
}

interface ProductItem {
  productId: number;
  productName: string;
  totalQuantity: number;
  totalRevenue: number;
  rank: number;
}

interface CategoryItem {
  categoryId: number;
  categoryName: string;
  totalQuantity: number;
  totalRevenue: number;
  rank: number;
}

export function TopProductsCategories({ dateFrom, dateTo, shouldFetch = false }: TopProductsCategoriesProps) {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('es-MX', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const fetchTopProductsCategories = async () => {
    if (!dateFrom || !dateTo) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await authenticatedFetch('/api/reports/top-products-categories', {
        method: 'POST',
        body: JSON.stringify({
          dateFrom,
          dateTo,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al obtener datos de productos y categorías');
      }

      const result = await response.json();

      if (result.success && result.data) {
        setProducts(result.data.products || []);
        setCategories(result.data.categories || []);
      } else {
        throw new Error(result.message || 'Error al obtener datos');
      }
    } catch (err) {
      console.error('Error fetching top products and categories:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setProducts([]);
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (shouldFetch && dateFrom && dateTo) {
      fetchTopProductsCategories();
    } else {
      setProducts([]);
      setCategories([]);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldFetch, dateFrom, dateTo]);

  if (isLoading) {
    return (
      <Card className="border-gray-200">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Cargando productos y categorías...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            Productos y Categorías con más ventas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Tabla de Productos */}
      <Card className="border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold text-[#006666] border-b-2 border-[#006666] pb-2">
            Productos con más ventas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {products.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-bold text-gray-700">Producto</TableHead>
                    <TableHead className="text-center font-bold text-gray-700">Unidades</TableHead>
                    <TableHead className="text-right font-bold text-gray-700">Ingreso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product, index) => (
                    <TableRow 
                      key={product.productId} 
                      className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                    >
                      <TableCell className="font-medium text-gray-900">
                        {product.productName}
                      </TableCell>
                      <TableCell className="text-center text-gray-700">
                        {formatNumber(product.totalQuantity)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-gray-900">
                        {formatCurrency(product.totalRevenue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <div className="text-center">
                <Package className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No hay datos de productos vendidos en el rango de fechas seleccionado</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabla de Categorías */}
      <Card className="border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold text-[#006666] border-b-2 border-[#006666] pb-2">
            Categorías con más ventas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {categories.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-bold text-gray-700">Categoría</TableHead>
                    <TableHead className="text-center font-bold text-gray-700">Unidades</TableHead>
                    <TableHead className="text-right font-bold text-gray-700">Ingreso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category, index) => (
                    <TableRow 
                      key={category.categoryId} 
                      className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                    >
                      <TableCell className="font-medium text-gray-900">
                        {category.categoryName}
                      </TableCell>
                      <TableCell className="text-center text-gray-700">
                        {formatNumber(category.totalQuantity)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-gray-900">
                        {formatCurrency(category.totalRevenue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <div className="text-center">
                <FolderTree className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No hay datos de categorías vendidas en el rango de fechas seleccionado</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
