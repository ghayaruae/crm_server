exports.global = {
    get current_date() {
        return new Date()
    },
    'base_server_file_url': 'https://crmapi.ghayar.com/',
};

exports.statusOptions = [
    { value: "0", label: "Pending" },
    { value: "1", label: "Assigned" },
    { value: "2", label: "Accepted" },
    { value: "3", label: "Packed" },
    { value: "4", label: "Shipped" },
    { value: "5", label: "Delivered" },
    { value: "6", label: "Cancelled" },
    { value: "7", label: "Returned" },
    { value: "8", label: "Returned Collected" },
    { value: "9", label: "Returned Received" },
]