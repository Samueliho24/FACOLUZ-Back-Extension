export function totalizePayments(paymentsList){
    let totalPaid = 0;
    paymentsList.forEach((element: any) => {
        if(element.receivedPaymentMethod === 3){
            totalPaid += element.paidAmount
        }else{
            let paidOnDolars = Number(element.paidAmount / element.exchangeRate);
            totalPaid += paidOnDolars;
        }

        if(element.returnedPaymentMethod === 3){
            totalPaid -= element.paidAmount
        }else{
            let returnedOnDolars = Number(element.returnedAmount / element.exchangeRate);
            totalPaid -= returnedOnDolars;
        }
    });
    return totalPaid;
}