import { useParams } from "react-router-dom"

function OrderPages() {
    const { token } = useParams()

    return (
        <>
            <main>
                {token}
            </main>
        </>
    )
}

export default OrderPages
