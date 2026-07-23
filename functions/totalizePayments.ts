export function totalizePayments(paymentsList: any){
    let totalPaid = 0;
    paymentsList.forEach((element: any) => {
        if(element.receivedPaymentMethod !== 4){
            totalPaid += element.paidAmount
        }

        if(element.returnedAmount !== null && element.returnedPaymentMethod !== 4){
            totalPaid -= element.returnedAmount
        }
    });
    return totalPaid;
}