import Button from "../ui/Button";
import { MdRestaurant } from "react-icons/md";

function OrdersCart() {
    return (
        <div className="w-15 h-15 bg-orange-500 shadow-3xl shadow-orange-500 rounded-full fixed z-9999 right-5 bottom-5 md:right-10 md:bottom-10">
            <Button
                type="button"
                className="w-full h-full flex items-center justify-center text-white relative"
            >
                <MdRestaurant size={28} />
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center shadow-md">
                    0
                </div>
            </Button>
        </div>
    );
}

export default OrdersCart;