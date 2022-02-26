import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    let newCart: Product[] = [];

    try {
      const response = await api.get<Stock>(`/stock/${productId}`);
      const productStock = response.data.amount;

      if (productStock <= 0) {
        toast.error('Quantidade solicitada fora de estoque');
      } else {
        const exist = cart.find(product => product.id === productId);
        
        if (exist) {
          if ((exist.amount + 1) > productStock) {
            toast.error('Quantidade solicitada fora de estoque');
          } else {
            newCart =
              cart.map(product =>
                product.id === productId ? { ...exist, amount: product.amount + 1 } : product
              );
            
            setCart(newCart);
            localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
          }
        } else {
          const resp = await api.get(`/products/${productId}`)
          const productItem = resp.data;

          newCart = [...cart, {...productItem, amount: 1}];
          setCart(newCart);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
        }
      }

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const exist = cart.find(product => product.id === productId);

      if (exist) {
        const newCart = cart.filter(product => product.id !== productId);
        setCart(newCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      } else {
        toast.error('Erro na remoção do produto');
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }
      
      const response = await api.get<Stock>(`/stock/${productId}`);
      const productStock = response.data.amount;

      if (productStock < amount) {
        toast.error('Quantidade solicitada fora de estoque');
      } else {
        const newCart = cart.map(product =>
          product.id === productId
            ? { ...product, amount: amount }
            : product
        )

        setCart(newCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
