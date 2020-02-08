
let APIResponseErrorHandler = (function () {

    const checkStatus = response => {

        if (response.status >= 200 && response.status < 300) {
            return response;
        }

        return response.json().then(json => {
            return Promise.reject({
                status: response.status,
                ok: false,
                statusText: response.statusText,
                body: json
            });
        });
    };

    const parseJSON = response => {

        if (response.status === 204 || response.status === 205) {
            return null;
        }
        return response.json();
    };

    const handleError = error => {
        error.response = {
            status: 0,
            statusText:
                "Cannot connect. Please make sure you are connected to internet and the API is up and running."
        };
        throw error;
    };

    return {
        ParseJSON: parseJSON,
        HandleError: handleError,
        CheckStatus: checkStatus,
    };

})();


// define a class
class Observable {
    // each instance of the Observer class
    // starts with an empty array of things (observers)
    // that react to a state change
    constructor() {
        this.observers = [];
    }

    // add the ability to subscribe to a new object / DOM element
    // essentially, add something to the observers array
    subscribe(f) {
        this.observers.push(f);
    }

    // add the ability to unsubscribe from a particular object
    // essentially, remove something from the observers array
    unsubscribe(f) {
        this.observers = this.observers.filter(subscriber => subscriber !== f);
    }

    // update all subscribed objects / DOM elements
    // and pass some data to each of them
    notify(data) {
        this.observers.forEach(observer => observer(data));
    }
}

let MessageCenter = (function ($) {

    let Urls;
    let Access_Token;

    function resetUI() {

        $('#MessageCenterErrorMessage').html('');
        $('#MessageCenterFailurePanel').hide();

        $('#MessageCenterRequestTypes').hide();
        $('#MessageCenterRequestTypesLoading').show();

        $('textarea').val('');
    }

    function displayErrormessage(errorMessage) {
        $('#MessageCenterErrorMessage').html(errorMessage);
        $('#MessageCenterFailurePanel').show();
    }

    function handleErrorResponse(errResponse, errMessage) {

        if (errResponse && errResponse.stack && errResponse.message) {
            displayErrormessage(errMessage);
        }

        // at this point its an api error with a proper json error response.
        let errorMessage = errResponse.body.Message;
        if (errResponse.status === 401) {
            displayErrormessage(errMessage);
            // UnAuthorizedHandler.Handle401();
        }
        else if (errResponse.status === 404) {
            displayErrormessage(errMessage);
        }
        else if (errResponse.status === 500) {
            displayErrormessage(errMessage);
        }
    }

    function loadMessageCenter(accountDetail) {

        resetUI();
        Access_Token = accountDetail.SelectedAccount.split('*')[1];

        let requestTypesUrl = `${Urls.getMessageCenterRequestTypes}`;
        fetch(requestTypesUrl, {
            method: 'GET',
            headers: {
                "Content-Type": "application/json",
                "Access_Token": Access_Token,
                "Is_Ajax_Request": true
            },
        }).catch(APIResponseErrorHandler.HandleError) // handle network issues
            .then(APIResponseErrorHandler.CheckStatus)
            .then(APIResponseErrorHandler.ParseJSON)
            .then((requestTypesResponse) => {
                let requestTypesDropDown = $('#MessageCenterRequestTypes');
                $.each(requestTypesResponse.RequestTypes, function () {
                    requestTypesDropDown.append($("<option />").val(this.RequestTypeId).text(this.RequestType));
                });
            })
            .catch((errResponse) => {
                handleErrorResponse(errResponse, 'An error occured. ');
            }).finally(() => {
                $('#MessageCenterRequestTypes').show();
                $('#MessageCenterRequestTypesLoading').hide();
            })
    }

    function ValidateMessageCenterForm(id, btnSubmitIds) {

        let formtoValidate = $(`#${id}`);
        if (formtoValidate && formtoValidate.length > 0) {

            var valid = formtoValidate.validate().checkForm();

            if (Array.isArray(btnSubmitIds)) {
                for (var i = 0; i < btnSubmitIds.length; i++) {
                    btnSubmitIds[i] = `#${btnSubmitIds[i]}`;
                }
                btnSubmitIds = btnSubmitIds.join();
            } else {
                btnSubmitIds = `#${btnSubmitIds}`;
            }

            if (valid) {
                $(btnSubmitIds).removeClass('disabled');
            } else {
                $(btnSubmitIds).addClass('disabled');
            }
        }
    }

    let init = function (urls) {
        Urls = urls;

        $("form[id='messageCenterForm']").validate({
            rules: {
                MessageCenterContent: {
                    required: true
                }, 
                MessageCenterRequestTypes: {
                    required: true
                }
            },
            messages: {
                MessageCenterContent:
                {
                    required: "Please enter your message."
                }, 
                MessageCenterRequestTypes: {
                    required: "Please select your request."
                }
            },
            highlight: function (element) {
                $(element).addClass('is-invalid');
            },
            unhighlight: function (element) {
                $(element).removeClass('is-invalid')
            },
            errorPlacement: function (error, element) {
                $(element).next().append(error);
            },
            submitHandler: function (form, event) {
                // always prevent the default in form submission.
                event.preventDefault();

                $('#MessageCenterFailurePanel').hide();

                let request = {
                    Notes: escape($('#MessageCenterContent').val()),
                    TaskType: $("#MessageCenterRequestTypes option:selected").text()
                }

                let messageCenterSubmitUrl = `${Urls.submitMessageCenterRequest}`;
                fetch(messageCenterSubmitUrl, {
                    method: 'POST',
                    headers: {
                        'RequestVerificationToken': $('input:hidden[name="__RequestVerificationToken"]').val(),
                        "Content-Type": "application/json",
                        "Access_Token": Access_Token,
                        "Is_Ajax_Request": true
                    },
                    body: JSON.stringify(request)
                }).catch(APIResponseErrorHandler.HandleError) // handle network issues
                    .then(APIResponseErrorHandler.CheckStatus)
                    .then(APIResponseErrorHandler.ParseJSON)
                    .then((data) => {
                        if (data.ResultCode === 1) {
                            $('#MessageCenterSuccessPanel').show();
                            $('#MesssageCenterTextAreaPanel').hide();
                            $('#MessageCenterSubmitPanel').hide();
                        } else {
                            displayErrormessage('An error occured in sending your message. ');
                        }
                    })
                    .catch((errResponse) => {
                        handleErrorResponse(errResponse, 'An error occured in sending your message. ');
                    }).finally(() => {
                    })
            }
        });

        $(`#messageCenterForm`).on('blur keyup change', 'input', function (event) {
            ValidateMessageCenterForm(`MessageCenterPanel`, `MessageCenterSubmitBtn`);
        });

        $(`#messageCenterForm`).find('select').on('change', function (event) {
            ValidateMessageCenterForm(`MessageCenterPanel`, `MessageCenterSubmitBtn`);
        });

        $('textarea').on('keyup', function (e) {
            ValidateMessageCenterForm(`MessageCenterPanel`, `MessageCenterSubmitBtn`);
        });

        ValidateMessageCenterForm(`messageCenterForm`, `MessageCenterSubmitBtn`);
    }

    return {
        Init: init,
        LoadMessageCenter: loadMessageCenter,
    };

})(jQuery);

let ProfilePreferences = (function ($) {

    let Urls;
    let Access_Token;
    let SelectedAccountDetails;

    let emailValidator;
    let phoneValidator;
    let passwordValidator;

    function resetUI() {

        $('#loadingPanelPhone').show();
        $('#loadingPanelEmail').show();
        $('#loadingPanelPassword').show();

        $('#emailPanel').hide();
        $('#phonePanel').hide();
        $('#passwordPanel').hide();


        $('#UpdateEmailFailurePanel').hide();
        $('#UpdatePhoneFailurePanel').hide();
        $('#UpdatePasswordFailurePanel').hide();
        $('#UpdateECommFailurePanel').hide();
    }

    function displayErrormessage(errPanel) {
        errPanel.show();
    }

    function handleErrorResponse(errResponse, errPanel) {

        if (errResponse && errResponse.stack && errResponse.message) {
            displayErrormessage(errPanel);
        }

        // at this point its an api error with a proper json error response.
        let errorMessage = errResponse.body.Message;
        if (errResponse.status === 401) {
            displayErrormessage(errPanel);
            // UnAuthorizedHandler.Handle401();
        }
        else if (errResponse.status === 404) {
            displayErrormessage(errPanel);
        }
        else if (errResponse.status === 500) {
            displayErrormessage(errPanel);
        }
    }

    function loadProfilePreferences(accountDetail) {

        resetUI();
        Access_Token = accountDetail.SelectedAccount.split('*')[1];
        SelectedAccountDetails = accountDetail.SelectedAccountDetails;

        $(function () {
            $('[data-toggle="tooltip"]').tooltip()
        })

        $('#loadingPanelPhone').hide();
        $('#loadingPanelEmail').hide();
        $('#loadingPanelPassword').hide();

        $('#emailPanel').show();
        $('#phonePanel').show();
        $('#passwordPanel').show();

        $('#AccountNumberDisplay').html(accountDetail.SelectedAccount.split('*')[0].split('-')[0]);
        $("#EmailDisplay").html(SelectedAccountDetails.Email);
        $("#PhoneNumberDisplay").html(SelectedAccountDetails.Cell);

        document.getElementById("chkPaperless").checked = accountDetail.SelectedAccountDetails.Paperless;
        document.getElementById("chkInvoice").checked = accountDetail.SelectedAccountDetails.EBill;
        if (accountDetail.SelectedAccountDetails.Paperless && accountDetail.SelectedAccountDetails.EBill) {
            $(".go").html(`<strong>Congrats!</strong><br>You are <br>Paperless`);
            $(".go").css("bottom", "55px");
        }
    }

    function initializeEmailUpdate() {

        let failurePanel = $('#UpdateEmailFailurePanel');
        emailValidator = $("form[name='changeEmailAddressForm']").validate({
            rules: {
                email: {
                    email: true,
                    required: true,
                },
                confirmEmail: {
                    equalTo: '[name="email"]',
                    email: true
                }
            },
            messages: {
                email: "Please enter a valid email address",
                confirmEmail: {
                    equalTo: "Emails should match"
                }
            },
            highlight: function (element) {
                $(element).addClass('is-invalid');
            },
            unhighlight: function (element) {
                $(element).removeClass('is-invalid')
            },
            errorPlacement: function (error, element) {
                $(element).next().append(error);
            },
            submitHandler: function (form, event) {

                // always prevent the default in form submission.
                event.preventDefault();

                // hide the failure panel initially.
                failurePanel.hide();

                let email = $("#email-address").val();
                let url = `${Urls.getUpdatedEmailMobile}`;

                fetch(url + "?Email=" + email, {
                    method: 'GET',
                    headers: {
                        "Content-Type": "application/json",
                        "Access_Token": Access_Token,
                        "Is_Ajax_Request": true
                    },
                }).catch(APIResponseErrorHandler.HandleError) // handle network issues
                    .then(APIResponseErrorHandler.CheckStatus)
                    .then(APIResponseErrorHandler.ParseJSON)
                    .then((data) => {
                        if (data.ResultCode === 1) {
                            $('.update-panel-email').hide();
                            $("#EmailDisplay").html(email);
                        } else {
                            displayErrormessage(failurePanel);
                        }
                    })
                    .catch((errResponse) => {
                        handleErrorResponse(errResponse, failurePanel);
                    }).finally(() => {
                    })
            }
        });
    }

    function initializePhonenumberUpdate() {

        let failurePanel = $('#UpdatePhoneFailurePanel');
        phoneValidator = $("form[name='changePhoneNumberForm']").validate({
            rules: {
                phone:
                {
                    PhoneNumberCheck: true,
                    required: true,
                },
                confirmPhone: {
                    equalTo: '[name="phone"]'
                }
            },
            messages: {
                phone: {
                    PhoneNumberCheck: "Please enter a valid phone number"
                },
                confirmPhone: {
                    equalTo: "Phone number should match"
                }
            },
            highlight: function (element) {
                $(element).addClass('is-invalid');
            },
            unhighlight: function (element) {
                $(element).removeClass('is-invalid')
            },
            errorPlacement: function (error, element) {
                $(element).next().append(error);
            },
            submitHandler: function (form, event) {

                // always prevent the default in form submission.
                event.preventDefault();

                // hide the failure panel initially.
                failurePanel.hide();

                var phoneNumber = $("#phone-number").val();
                fetch(`${Urls.getUpdatedEmailMobile}?Mobile=${phoneNumber}&Email=${SelectedAccountDetails.Email}`, {
                    method: 'GET',
                    headers: {
                        "Content-Type": "application/json",
                        "Access_Token": Access_Token,
                        "Is_Ajax_Request": true
                    },
                }).catch(APIResponseErrorHandler.HandleError) // handle network issues
                    .then(APIResponseErrorHandler.CheckStatus)
                    .then(APIResponseErrorHandler.ParseJSON)
                    .then((data) => {
                        if (data.ResultCode === 1) {
                            $('.update-panel-phone-Number').hide();
                            $("#PhoneNumberDisplay").html(phoneNumber);
                        } else {
                            displayErrormessage(failurePanel);
                        }
                    })
                    .catch((errResponse) => {
                        handleErrorResponse(errResponse, failurePanel);
                    }).finally(() => {
                    })
            }
        });
    }

    function initializePasswordUpdate() {

        let failurePanel = $('#UpdatePasswordFailurePanel');
        passwordValidator = $("form[name='changePasswordForm']").validate({
            rules: {
                password:
                {
                    PasswordCheck: true,
                    required: true,
                },
                confirmPassword: {
                    equalTo: '[name="password"]'
                }
            },
            messages: {
                phone: {
                    PasswordCheck: "Please enter a valid password"
                },
                confirmPhone: {
                    equalTo: "Password should match"
                }
            },
            highlight: function (element) {
                $(element).addClass('is-invalid');
            },
            unhighlight: function (element) {
                $(element).removeClass('is-invalid')
            },
            errorPlacement: function (error, element) {
                $(element).next().append(error);
            },
            submitHandler: function (form, event) {

                // always prevent the default in form submission.
                event.preventDefault();

                // hide the failure panel initially.
                failurePanel.hide();

                let request = {
                    NewPassword: $("#password").val(),
                }

                let url = `${Urls.getResetPassword}`;
                fetch(url, {
                    method: 'POST',
                    headers: {
                        'RequestVerificationToken': $('input:hidden[name="__RequestVerificationToken"]').val(),
                        "Content-Type": "application/json",
                        "Access_Token": Access_Token,
                        "Is_Ajax_Request": true
                    },
                    body: JSON.stringify(request)
                }).catch(APIResponseErrorHandler.HandleError) // handle network issues
                    .then(APIResponseErrorHandler.CheckStatus)
                    .then(APIResponseErrorHandler.ParseJSON)
                    .then((data) => {
                        if (data.ResultCode === 1) {
                            $(".update-panel-password").hide();
                        } else {
                            displayErrormessage(failurePanel);
                        }
                    })
                    .catch((errResponse) => {
                        handleErrorResponse(errResponse, failurePanel);
                    }).finally(() => {
                    })
            }
        });
    }

    function initializeEnableEcommunicationorEbill() {

        $(document).on('click', '[id ^= "btnEcommunicationorEbill"]', function () {

            let failurePanel = $('#UpdateECommFailurePanel');
            failurePanel.hide();

            let request = {
                Ebill: $('#chkInvoice')["0"].checked,
                ECommunication: $('#chkPaperless')["0"].checked,
                CustNo: SelectedAccountDetails.Customer_Number,
                Emailid: SelectedAccountDetails.Email,
                MobileProvider: SelectedAccountDetails.MobileProviderCode,
                Language: SelectedAccountDetails.LanguageCode
            }

            let url = `${Urls.getSubmitEnableEcommunicationOrEbill}`;
            fetch(url, {
                method: 'POST',
                headers: {
                    'RequestVerificationToken': $('input:hidden[name="__RequestVerificationToken"]').val(),
                    "Content-Type": "application/json",
                    "Access_Token": Access_Token,
                    "Is_Ajax_Request": true
                },
                body: JSON.stringify(request)
            }).catch(APIResponseErrorHandler.HandleError) // handle network issues
                .then(APIResponseErrorHandler.CheckStatus)
                .then(APIResponseErrorHandler.ParseJSON)
                .then((data) => {
                    if (data.ResultCode === 1) {
                        $('#EcommOrEbillSuccessPanel').show();
                        $('#EcommOrEbillSuccessPanel').fadeOut(5000);
                    } else {
                        displayErrormessage(failurePanel);
                    }
                })
                .catch((errResponse) => {
                    handleErrorResponse(errResponse, failurePanel);
                }).finally(() => {
                })
        });
    }

    let init = function (urls) {

        Urls = urls;

        $('#btnUpdateEmailAddress').click(function (e) {
            e.preventDefault();
            let fonticon = $(this).find('>:first-child');
            var pencilClass = fonticon[0].className.split(' ')[1];
            if (pencilClass === 'fa-pencil') {
                fonticon.removeClass('fa-pencil').addClass('fa-remove');
            } else {
                fonticon.removeClass('fa-remove').addClass('fa-pencil');
            }
            $('.update-panel-email').toggle(250);
        });

        $('#btnUpdatePhoneNumber').click(function (e) {
            e.preventDefault();
            let fonticon = $(this).find('>:first-child');
            var pencilClass = fonticon[0].className.split(' ')[1];
            if (pencilClass === 'fa-pencil') {
                fonticon.removeClass('fa-pencil').addClass('fa-remove');
            } else {
                fonticon.removeClass('fa-remove').addClass('fa-pencil');
            }
            $('.update-panel-phone-Number').toggle(250);
        });

        $('#btnPassword').click(function (e) {
            e.preventDefault();
            let fonticon = $(this).find('>:first-child');
            var pencilClass = fonticon[0].className.split(' ')[1];
            if (pencilClass === 'fa-pencil') {
                fonticon.removeClass('fa-pencil').addClass('fa-remove');
            } else {
                fonticon.removeClass('fa-remove').addClass('fa-pencil');
            }
            $('.update-panel-password').toggle(250);
        });

        $('#cancel-email-panel').click(function (e) {
            $("form[name='changeEmailAddressForm'] :input").val('');
            emailValidator.resetForm();
            $('#UpdateEmailFailurePanel').hide();
            $('.update-panel-email').toggle(250);
        });

        $('#cancel-phone-panel').click(function (e) {
            $("form[name='changePhoneNumberForm'] :input").val('');
            phoneValidator.resetForm();
            $('#UpdatePhoneFailurePanel').hide();
            $('.update-panel-phone-Number').toggle(250);
        });

        $('#cancel-password-panel').click(function (e) {
            $("form[name='changePasswordForm'] :input").val('');
            passwordValidator.resetForm();
            $('#UpdatePasswordFailurePanel').hide();
            $('.update-panel-password').toggle(250);
        });

        jQuery.validator.addMethod("PhoneNumberCheck", function (value, element) {
            return /^-?\d*$/.test(value);
        }, "Please enter a valid phone number.");

        jQuery.validator.addMethod("PasswordCheck", function (value, element) {
            return /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,20}$/.test(value);
        }, "Please enter a valid password.");

        $('#chkInvoice').click(function () {
            if ($(this).prop("checked")) {
                if ($('#chkPaperless')["0"].checked) {
                    $(".go").html(`<strong>Congrats!</strong><br>You are <br>Paperless`);
                    $(".go").css("bottom", "55px");
                }
            }
            else {
                $(".go").html(`<strong>Go Paperless!</strong>`);
                $(".go").css("bottom", "90px");
            }
        });

        $('#chkPaperless').click(function () {
            if ($(this).prop("checked")) {
                $('#chkInvoice')["0"].checked = true;
                $(".go").html(`<div><strong>Congrats!</strong><br>You are <br>Paperless</div>`);
                $(".go").css("bottom", "55px");
            }
            else {
                $(".go").html(`<strong>Go Paperless!</strong>`);
                $(".go").css("bottom", "90px");
            }
        });

        initializeEmailUpdate();
        initializePhonenumberUpdate();
        initializePasswordUpdate();
        initializeEnableEcommunicationorEbill();

        $(`#messageCenterForm`).on('blur keyup change', 'input', function (event) {
            ValidateMessageCenterForm(`MessageCenterPanel`, `MessageCenterSubmitBtn`);
        });

        $(`#messageCenterForm`).find('select').on('change', function (event) {
            ValidateMessageCenterForm(`MessageCenterPanel`, `MessageCenterSubmitBtn`);
        });

        $('textarea').on('keyup', function (e) {
            ValidateMessageCenterForm(`MessageCenterPanel`, `MessageCenterSubmitBtn`);
        });

        // ValidateMessageCenterForm(`messageCenterForm`, `MessageCenterSubmitBtn`);
    }

    return {
        Init: init,
        LoadProfilePreferences: loadProfilePreferences,
    };

})(jQuery);

let AccountSelector = (function ($) {

    const AccountSelectorObserver = new Observable();
    let Urls;
    let LoadAccountDetails;
    let Brand;
    let SelectedAccountStoreKey;
    let AccountsStoreKey;

    function registerObserver(func) {
        AccountSelectorObserver.subscribe(func);
    }

    function buildAccountSelector(accounts, selectedAccount) {

        var accountSelectorCount = $('#accountsSelector').length;

        // if the account selector dropdown does not exist
        // dont rely on the dropdown, just notify the observers.
        if (accountSelectorCount === 0) {
            store.set(SelectedAccountStoreKey, selectedAccount);
            getAccountDetails();
            return;
        }

        $('#accountsSelector').append(accounts.map(function (item) {
            return `<option id='${item.AccountId}' value='${item.CustomerNumber}-${item.AccountId}*${item.AccessToken}'>${item.DisplayValue}</option>`;
        }));

        $('#accountsSelector').on('change', () => {

            let storage_expiry_seconds = 50000;
            let selectedItem = $('#accountsSelector').val();
            let accountsListFromStore = store.get(AccountsStoreKey);
            let expiryTime = new Date().getTime() + storage_expiry_seconds;
            store.set(SelectedAccountStoreKey, selectedItem);

            // REVISIT
            //store.set(AccountsStoreKey, accountsListFromStore, expiryTime);
            //store.set(SelectedAccountStoreKey, selectedItem, expiryTime);

            // if the observers dont need the accountdetails don't load the account detail
            // just notify the observers with the selected account Id.

            if (!LoadAccountDetails) {
                AccountSelectorObserver.notify({ SelectedAccount: selectedItem });
                return;
            }

            let access_token = selectedItem.split('*')[1];
            let url = `${Urls.getAccountDetailsUrl}?accessToken=${access_token}`;
            fetch(url, {
                method: 'GET',
                headers: {
                    "Content-Type": "application/json"
                },
            }).then((response) => {
                if (response.status === 200) {
                    response.json().then(function (data) {
                        if (data) {
                            AccountSelectorObserver.notify({ SelectedAccountDetails: data, SelectedAccount: selectedItem });
                        }
                    });
                } else if (response.status === 400) {
                    response.json().then(function (data) {
                    }).catch((error) => { throw error });
                }
                else if (response.status === 500) {
                }
            }).catch((error) => {
            }).finally(() => {
            })
        });

        if (selectedAccount) {
            $("#accountsSelector").val(selectedAccount).change();
        }

        $('#accountsSelectorLoading').hide();
        $('#accountsSelector').show();

        if (accounts.length === 1) {
            $("#accountsSelector").attr("disabled", true);
        }
    }

    function loadAccounts(accountInfo) {
        buildAccountSelector(accountInfo.Accounts, accountInfo.SelectedAccount)
    }

    function getAccountDetails() {

        let selectedAccount = store.get(SelectedAccountStoreKey);

        if (!LoadAccountDetails) {
            AccountSelectorObserver.notify({ SelectedAccount: selectedAccount });
            return;
        }
        let access_token = selectedAccount.split('*')[1];
        let url = `${Urls.getAccountDetailsUrl}?accessToken=${access_token}`;
        fetch(url, {
            method: 'GET',
            headers: {
                "Content-Type": "application/json"
            },
        }).then((response) => {
            if (response.status === 200) {
                response.json().then(function (data) {
                    if (data) {
                        AccountSelectorObserver.notify({ SelectedAccountDetails: data, SelectedAccount: selectedAccount });
                    }
                });
            } else if (response.status === 400) {
                response.json().then(function (data) {
                }).catch((error) => { throw error });
            }
            else if (response.status === 500) {
            }
        }).catch((error) => {
        }).finally(() => {
        })
    }

    let reload = function () {
        getAccountDetails();
    }

    let init = function (urls, loadAccountDetails = false, brand) {

        Urls = urls;
        LoadAccountDetails = loadAccountDetails;

        Brand = brand;
        SelectedAccountStoreKey = `SelectedAccount_${Brand}`;
        AccountsStoreKey = `Accounts_${Brand}`
    }

    return {
        Init: init,
        LoadAccounts: loadAccounts,
        RegisterObserver: registerObserver,
        Reload: reload
    };

})(jQuery);
let UnAuthorizedHandler = (function ($) {

    function handle401() {

        // clear the browser isolated storage
        store.clearAll();

        // reload the page and this should navigate to the login since its a 401
        location.reload();
    }

    let init = function () {
    }

    return {
        Init: init,
        Handle401: handle401,
    };

})(jQuery);

let Dashboard = (function ($) {

    let Urls;
    let Brand;
    const DashBoardObserver = new Observable();

    function RegisterObserver(func) {
        DashBoardObserver.subscribe(func);
    }

    function multiAccountModalInit() {
        MultiAccountModal.Init(DashBoardObserver, Urls, Brand);
    }

    let init = function (urls, brand) {
        Urls = urls;
        Brand = brand;
        multiAccountModalInit();

        $(document).on("click", "#btnLogout", function (e) {
            e.preventDefault();
            LogoutHandler.Logout();
            return false;
        });
    }

    return {
        Init: init,
        RegisterObserver: RegisterObserver
    };

})(jQuery);

let MultiAccountModal = (function ($) {

    let SelectedAccount;
    let storage_expiry_seconds = 50000;
    let DashBoardObserver;
    let Urls;
    let Brand;
    let SelectedAccountStoreKey;
    let AccountsStoreKey;

    function loadAccounts() {

        // first try to load from storage
        let accounts_storage = store.get(AccountsStoreKey);
        let selectedAccount_storage = store.get(SelectedAccountStoreKey);
        if (accounts_storage && selectedAccount_storage) {
            DashBoardObserver.notify({ Accounts: accounts_storage, SelectedAccount: selectedAccount_storage });
            return;
        }

        // Here there is no accounts and selected account to be loaded from storage.
        // Make a service call to get data from the server.
        // Launch the modal window for service Account Loader
        let multiAccountPlaceholderElement = $('#multi-account-modal-placeholder');
        multiAccountPlaceholderElement.find('.modal').modal({
            backdrop: 'static',
            keyboard: false,
            show: true
        });

        fetch(Urls.getAccountsUrl, {
            method: 'GET',
            headers: {
                "Content-Type": "application/json"
            },
        }).then((response) => {
            if (response.status === 200) {
                response.json().then(function (data) {
                    if (data && data.Accounts) {

                        // if there is only one account set the only account 
                        // to be the selected account.
                        if (data.Accounts.length === 1) {
                            $("#multiAccountModal").modal("hide");
                            SelectedAccount = `${data.Accounts[0].CustomerNumber}-${data.Accounts[0].AccountId}*${data.Accounts[0].AccessToken}`;
                            saveToStorage(data.Accounts, SelectedAccount);
                            DashBoardObserver.notify({ Accounts: data.Accounts, SelectedAccount: SelectedAccount });
                        }
                        else {

                            let accountstemplate = $('#accountsTemplate').html();
                            $("#accountsPanel").empty().html(Mustache.to_html(accountstemplate, { RootTag: data.Accounts }));

                            let pattern = 'accountItem';
                            $("div[id^=" + pattern + "]").click(function () {
                                let selectedAccount = $(this).attr('id').split('accountItem-')[1];
                                saveToStorage(data.Accounts, selectedAccount);
                                $("#multiAccountModal").modal("hide");
                                DashBoardObserver.notify({ Accounts: data.Accounts, SelectedAccount: selectedAccount });
                            });
                        }

                        // store the accounts in browsers store
                        function saveToStorage(accounts, selectedAccount) {
                            SelectedAccount = selectedAccount;
                            let expiryTime = new Date().getTime() + storage_expiry_seconds;
                            store.set(AccountsStoreKey, accounts);
                            store.set(SelectedAccountStoreKey, selectedAccount);

                            // REVISIT......
                            // store.set(AccountsStoreKey, accounts, expiryTime);
                            // store.set(SelectedAccountStoreKey, selectedAccount, expiryTime);
                        }
                    }
                });
            } else if (response.status === 400) {
                response.json().then(function (data) {
                }).catch((error) => { throw error });
            }
            else if (response.status === 500) {
                $('#sendSMSError').show();
                $('#sendSMSError').find("b").html("Error in sending the SMS!! Please try again!!");
            }
        }).catch((error) => {
        }).finally(() => {
            $('#multiAccountPanelLoading').hide();
            $('#multiAccountPanel').show();
        })
    }

    function assignEventHandlers() {

        console.log('I am Dashboard!!!');

        // register the observers for the modal popup selector.
        DashBoardObserver.subscribe(AccountSelector.LoadAccounts);
        // register the observer for the account selector DropDown

        // load accounts
        loadAccounts();
    }

    let init = function (dashBoardObserver, urls, brand) {
        Urls = urls;
        Brand = brand;
        SelectedAccountStoreKey = `SelectedAccount_${Brand}`;
        AccountsStoreKey = `Accounts_${Brand}`;

        DashBoardObserver = dashBoardObserver;
        assignEventHandlers();
    }

    return {
        Init: init,
        SelectedAccount: SelectedAccount
    };

})(jQuery);

let DashboardLowerPanel = (function ($) {

    let Urls;

    function resetUI() {
        $('#lowerPanelSecondItemLoadingPanel').show();
        $('#autopaysingupPanel').hide();
        $('#budgetbillingSignUpPanel').hide();
        $('#energysavingtipsPanel').hide();
    }

    function loadDashboardLowerPanel(accountDetail) {

        resetUI();

        let selectedAccount = accountDetail.SelectedAccountDetails;
        let paperless = selectedAccount.Paperless;

        $('#lowerPanelSecondItemLoadingPanel').hide();

        if (!selectedAccount.Auto_Pay) {
            $('#autopaysingupPanel').show();
        } else if (selectedAccount.Auto_Pay && !paperless) {
            $('#budgetbillingSignUpPanel').show();
        } else {
            $('#energysavingtipsPanel').show();
        }
    }

    let init = function (urls) {
        Urls = urls;
    }

    return {
        Init: init,
        LoadDashboardLowerPanel: loadDashboardLowerPanel,
    };

})(jQuery);

let LogoutHandler = (function ($) {

    let Urls;
    let AccountDetail;

    function setSelectedAccount(accountDetail) {
        AccountDetail = accountDetail;
    }



    function logout() {

        // clear the browser isolated storage
        store.clearAll();

        let Access_Token = AccountDetail.SelectedAccount.split('*')[1];
        let Url = `${Urls.logout}`;

        fetch(Url, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "Access_Token": Access_Token,
                "Is_Ajax_Request": true
            },
        }).then((response) => {
            if (response.status === 200) {
                response.json().then(function (data) {
                    window.location.href = data.redirectToUrl;
                });
            } else if (response.status === 400) {
                response.json().then(function (data) {
                }).catch((error) => { throw error });
            } else if (response.status === 401) {
                UnAuthorizedHandler.Handle401();
            }
            else if (response.status === 500) {
            }
        }).catch((error) => {
        }).finally(() => {

        })
    }

    let init = function (urls) {
        Urls = urls;
    }

    return {
        Init: init,
        SetSelectedAccount: setSelectedAccount,
        Logout: logout,
    };

})(jQuery);


let EnergyInsightsUsageHistory = (function ($) {

    let Urls;

    let Access_Token;
    let Url;
    let MonthlyChartData = new Array();
    let DailyChartData = new Array();
    let DayNames = new Array();
    let SelectedMonth;
    let SelectedDay;

    function resetUI() {
        $('#UsageHistoryLoadingPanel').show();
        $('#UsageHistoryChartPanel').hide();
        $('#NoUsageHistoryPanel').hide();
    }

    function loadEnergyInsightsUsageHistory(account) {

        resetUI();

        Access_Token = account.SelectedAccount.split('*')[1];
        Url = `${Urls.getUsageHistory}`;

        var montlyChart = $("#MonthlyChart").data("kendoChart");
        let montlyChartDataSource = montlyChart.dataSource;
        montlyChartDataSource.transport.options.read.beforeSend = function (xhr) {
            xhr.setRequestHeader('Access_Token', Access_Token);
            xhr.setRequestHeader('Is_Ajax_Request', true);
        };
        montlyChartDataSource.read();
        return;


        fetch(Url, {
            method: 'GET',
            headers: {
                "Content-Type": "application/json",
                "Access_Token": Access_Token,
                "Is_Ajax_Request": true
            }
        }).then((response) => {
            if (response.status === 200) {
                response.json().then(function (data) {
                    if (data) {

                        //$('#NoUsageHistoryPanel').hide();
                        //$('#UsageHistoryChartPanel').show();



                        let usageHistory =
                            [{ "Service_Account_Id": 2435116, "Usage_Month": "2017-09-01T00:00:00", "Usage_Start_Date": "2017-09-23T00:00:00", "Usage_End_Date": "2017-09-27T00:00:00", "Usage_Type": "Actual", "Usage": 34, "Usage_Uom": "kWh" }, { "Service_Account_Id": 2435116, "Usage_Month": "2017-10-01T00:00:00", "Usage_Start_Date": "2017-09-27T00:00:00", "Usage_End_Date": "2017-10-26T00:00:00", "Usage_Type": "Actual", "Usage": 291, "Usage_Uom": "kWh" }, { "Service_Account_Id": 2435116, "Usage_Month": "2017-11-01T00:00:00", "Usage_Start_Date": "2017-10-26T00:00:00", "Usage_End_Date": "2017-11-28T00:00:00", "Usage_Type": "Actual", "Usage": 265, "Usage_Uom": "kWh" }, { "Service_Account_Id": 2435116, "Usage_Month": "2017-12-01T00:00:00", "Usage_Start_Date": "2017-11-28T00:00:00", "Usage_End_Date": "2017-12-29T00:00:00", "Usage_Type": "Actual", "Usage": 256, "Usage_Uom": "kWh" }, { "Service_Account_Id": 2435116, "Usage_Month": "2018-01-01T00:00:00", "Usage_Start_Date": "2017-12-29T00:00:00", "Usage_End_Date": "2018-01-30T00:00:00", "Usage_Type": "Actual", "Usage": 274, "Usage_Uom": "kWh" }, { "Service_Account_Id": 2435116, "Usage_Month": "2018-02-01T00:00:00", "Usage_Start_Date": "2018-01-30T00:00:00", "Usage_End_Date": "2018-02-28T00:00:00", "Usage_Type": "Actual", "Usage": 181, "Usage_Uom": "kWh" }, { "Service_Account_Id": 2435116, "Usage_Month": "2018-03-01T00:00:00", "Usage_Start_Date": "2018-02-28T00:00:00", "Usage_End_Date": "2018-03-29T00:00:00", "Usage_Type": "Actual", "Usage": 164, "Usage_Uom": "kWh" }, { "Service_Account_Id": 2435116, "Usage_Month": "2018-04-01T00:00:00", "Usage_Start_Date": "2018-03-29T00:00:00", "Usage_End_Date": "2018-04-30T00:00:00", "Usage_Type": "Actual", "Usage": 206, "Usage_Uom": "kWh" }, { "Service_Account_Id": 2435116, "Usage_Month": "2018-05-01T00:00:00", "Usage_Start_Date": "2018-04-30T00:00:00", "Usage_End_Date": "2018-05-30T00:00:00", "Usage_Type": "Actual", "Usage": 255, "Usage_Uom": "kWh" }, { "Service_Account_Id": 2435116, "Usage_Month": "2018-06-01T00:00:00", "Usage_Start_Date": "2018-05-30T00:00:00", "Usage_End_Date": "2018-06-28T00:00:00", "Usage_Type": "Actual", "Usage": 408, "Usage_Uom": "kWh" }, { "Service_Account_Id": 2435116, "Usage_Month": "2018-07-01T00:00:00", "Usage_Start_Date": "2018-06-28T00:00:00", "Usage_End_Date": "2018-07-30T00:00:00", "Usage_Type": "Actual", "Usage": 480, "Usage_Uom": "kWh" }, { "Service_Account_Id": 2435116, "Usage_Month": "2018-08-01T00:00:00", "Usage_Start_Date": "2018-07-30T00:00:00", "Usage_End_Date": "2018-08-28T00:00:00", "Usage_Type": "Actual", "Usage": 747, "Usage_Uom": "kWh" }, { "Service_Account_Id": 2435116, "Usage_Month": "2018-09-01T00:00:00", "Usage_Start_Date": "2018-08-28T00:00:00", "Usage_End_Date": "2018-09-27T00:00:00", "Usage_Type": "Actual", "Usage": 760, "Usage_Uom": "kWh" }, { "Service_Account_Id": 2435116, "Usage_Month": "2018-10-01T00:00:00", "Usage_Start_Date": "2018-09-27T00:00:00", "Usage_End_Date": "2018-10-26T00:00:00", "Usage_Type": "Actual", "Usage": 538, "Usage_Uom": "kWh" }, { "Service_Account_Id": 2435116, "Usage_Month": "2018-11-01T00:00:00", "Usage_Start_Date": "2018-10-26T00:00:00", "Usage_End_Date": "2018-11-28T00:00:00", "Usage_Type": "Actual", "Usage": 394, "Usage_Uom": "kWh" }, { "Service_Account_Id": 2435116, "Usage_Month": "2018-12-01T00:00:00", "Usage_Start_Date": "2018-11-28T00:00:00", "Usage_End_Date": "2018-12-31T00:00:00", "Usage_Type": "Actual", "Usage": 284, "Usage_Uom": "kWh" }, { "Service_Account_Id": 2435116, "Usage_Month": "2019-01-01T00:00:00", "Usage_Start_Date": "2018-12-31T00:00:00", "Usage_End_Date": "2019-01-30T00:00:00", "Usage_Type": "Actual", "Usage": 194, "Usage_Uom": "kWh" }, { "Service_Account_Id": 2435116, "Usage_Month": "2019-02-01T00:00:00", "Usage_Start_Date": "2019-01-30T00:00:00", "Usage_End_Date": "2019-02-28T00:00:00", "Usage_Type": "Actual", "Usage": 252, "Usage_Uom": "kWh" }, { "Service_Account_Id": 2435116, "Usage_Month": "2019-03-01T00:00:00", "Usage_Start_Date": "2019-02-28T00:00:00", "Usage_End_Date": "2019-03-29T00:00:00", "Usage_Type": "Actual", "Usage": 185, "Usage_Uom": "kWh" }, { "Service_Account_Id": 2435116, "Usage_Month": "2019-04-01T00:00:00", "Usage_Start_Date": "2019-03-29T00:00:00", "Usage_End_Date": "2019-04-30T00:00:00", "Usage_Type": "Actual", "Usage": 246, "Usage_Uom": "kWh" }, { "Service_Account_Id": 2435116, "Usage_Month": "2019-05-01T00:00:00", "Usage_Start_Date": "2019-04-30T00:00:00", "Usage_End_Date": "2019-05-30T00:00:00", "Usage_Type": "Actual", "Usage": 309, "Usage_Uom": "kWh" }, { "Service_Account_Id": 2435116, "Usage_Month": "2019-06-01T00:00:00", "Usage_Start_Date": "2019-05-30T00:00:00", "Usage_End_Date": "2019-06-28T00:00:00", "Usage_Type": "Actual", "Usage": 352, "Usage_Uom": "kWh" }, { "Service_Account_Id": 2435116, "Usage_Month": "2019-07-01T00:00:00", "Usage_Start_Date": "2019-06-28T00:00:00", "Usage_End_Date": "2019-07-30T00:00:00", "Usage_Type": "Actual", "Usage": 426, "Usage_Uom": "kWh" }, { "Service_Account_Id": 2435116, "Usage_Month": "2019-08-01T00:00:00", "Usage_Start_Date": "2019-07-30T00:00:00", "Usage_End_Date": "2019-08-23T00:00:00", "Usage_Type": "Actual", "Usage": 322, "Usage_Uom": "kWh" }]

                        usageHistory = data;

                        usageHistory = processApiData(usageHistory);
                        usageHistory.sort((a, b) => a.date - b.date);

                        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
                            'September', 'October', 'November', 'December'];

                        let xAxisNames = usageHistory.map(item => {
                            let date = item.date;
                            return ((date.getMonth() > 8) ? (date.getMonth() + 1) : ('0' + (date.getMonth() + 1))) + '/' + ((date.getDate() > 9) ? date.getDate() : ('0' + date.getDate())) + '/' + date.getFullYear();
                        });

                        let chartData = {
                            datasets: [{
                                data: _.map(usageHistory, item => item.avgTemperature),
                                borderColor: ['rgb(139,0,0)'],
                                borderWidth: 2,
                                type: 'line',
                                label: 'Temperature',
                                fill: false,
                            }],
                            labels: xAxisNames
                        };


                        var config = {
                            type: 'line',
                            data: {
                                labels: monthNames,
                                datasets: [{
                                    label: 'My First dataset',
                                    backgroundColor: ['rgb(139,0,0)'],
                                    borderColor: ['rgb(139,0,0)'],
                                    data: _.map(usageHistory, item => item.avgTemperature),
                                    fill: false,
                                }]
                            },
                            options: {
                                responsive: true,
                                title: {
                                    display: true,
                                    text: 'Chart.js Line Chart'
                                },
                                tooltips: {
                                    mode: 'index',
                                    intersect: false,
                                },
                                hover: {
                                    mode: 'nearest',
                                    intersect: true
                                },
                                scales: {
                                    xAxes: [{
                                        display: true,
                                        scaleLabel: {
                                            display: true,
                                            labelString: 'Month'
                                        }
                                    }],
                                    yAxes: [{
                                        display: true,
                                        scaleLabel: {
                                            display: true,
                                            labelString: 'Value'
                                        },
                                        ticks: {

                                            stepSize: 10
                                        }
                                    }]
                                }
                            }
                        };


                        return;

                        var ctx = $('#UsageHistoryCanvas')[0].getContext('2d');
                        let myLine = new Chart(ctx, config);
                        //let usageHistoryBarChart = new Chart(ctx, {
                        //    type: 'bar',
                        //    data: chartData,
                        //    options: {
                        //        scaleShowVerticalLines: false,
                        //        responsive: true,
                        //        maintainAspectRatio: false,
                        //        legend: {
                        //            position: 'top',
                        //        },
                        //        tooltips: {
                        //            callbacks: {
                        //                label: (tooltipItem) => {
                        //                    return tooltipItem.yLabel + 'kwh';
                        //                }
                        //            }
                        //        }
                        //    },
                        //});
                    }
                    else {
                        //$('#NoUsageHistoryPanel').show();
                        //$('#UsageHistoryChartPanel').hide();
                    }
                });
            } else if (response.status === 400) {
                response.json().then(function (data) {
                }).catch((error) => { throw error });
            }
            else if (response.status === 401) {
                UnAuthorizedHandler.Handle401();
            }
            else if (response.status === 500) {

            }
        }).catch((error) => {
        }).finally(() => {
        })
    }

    // Set the Initial Usage History Chart
    function setMonthlyUsageGrid() {

        $('#UsageHistoryDailyLoadingPanel').hide();
        $('#UsageChartMonthlyDiv').show();
        $('#UsageChartDailyDiv').hide();
        $('#UsageChartHourlyDiv').hide();

        $("#UsageHistoryHeader").html("Invoiced Monthly Usage History");
        $("#ZoomOutDiv").hide();
        $('#btnDailyUsageGroup').hide();
        $('#btnHourlyUsageGroup').hide();

        $("#btnCurrent").html('');

        $('#btnDailyPrev').removeAttr('disabled');
        $('#btnDailyNext').removeAttr('disabled');

        $('#btnHourlyPrev').removeAttr('disabled');
        $('#btnHourlyNext').removeAttr('disabled');
    }

    /* montly chart */
    function monthly_chart_dataBound() {

        let chart = $("#MonthlyChart").data("kendoChart");
        for (var i = 0; i < chart.dataSource.view().length; i++) {
            MonthlyChartData[i] = chart.dataSource.view()[i].StartDate + "-" + chart.dataSource.view()[i].EndDate
        }
    }

    function monthly_chart_seriesClick(e) {
        SelectedMonth = (e.dataItem.StartDate + "-" + e.dataItem.EndDate);
        loadMonthlyChart(SelectedMonth);
    }

    function loadMonthlyChart(selectedMonth) {

        let selectedIndex = MonthlyChartData.indexOf(selectedMonth);
        if (selectedIndex !== 0 || selectedIndex !== DailyChartData.length - 1) {
            $('#btnDailyNext').removeAttr('disabled');
            $('#btnDailyPrev').removeAttr('disabled');
        }

        if (selectedIndex === DailyChartData.length - 1) {
            $('#btnDailyNext').attr('disabled', 'disabled');
        }
        if (selectedIndex === 0) {
            $('#btnDailyPrev').attr('disabled', 'disabled');
        }

        let startDate = selectedMonth.split('-')[0];
        let endDate = selectedMonth.split('-')[1];

        let api_url = `${Url}?StartDate=${startDate}&EndDate=${endDate}&ResolutionCode=P`;

        $('#UsageHistoryDailyLoadingPanel').show();

        /*
        $('#UsageChartMonthlyDiv').hide();
        $('#UsageChartDailyDiv').hide();
        $('#btnDailyUsageGroup').hide();
        */

        fetch(api_url, {
            method: 'GET',
            headers: {
                "Content-Type": "application/json",
                "Access_Token": Access_Token,
                "Is_Ajax_Request": true
            }
        }).then((response) => {
            if (response.status === 200) {
                response.json().then(function (data) {
                    if (data) {

                        $('#UsageHistoryDailyLoadingPanel').hide();
                        $('#UsageChartMonthlyDiv').hide();
                        $('#UsageChartDailyDiv').show();
                        $("#DailyChart").data("kendoChart").dataSource.data(data);

                        $("#UsageHistoryHeader").html("Daily Usage History");
                        $("#ZoomOutDiv").show();
                        $('#btnDailyUsageGroup').show();
                        $("#btnCurrent").html(startDate + " - " + endDate);
                    }
                });
            } else if (response.status === 400) {
                response.json().then(function (data) {
                }).catch((error) => { throw error });
            }
            else if (response.status === 401) {
                UnAuthorizedHandler.Handle401();
            }
            else if (response.status === 500) {

            }
        }).catch((error) => {
        }).finally(() => {
        })
    }

    function loadDailyChart(selectedDay, selectedItem) {

        let selectedIndex = DailyChartData.indexOf(selectedDay);
        if (selectedIndex !== 0 || selectedIndex !== DailyChartData.length - 1) {
            $('#btnHourlyNext').removeAttr('disabled');
            $('#btnHourlyPrev').removeAttr('disabled');
        }

        if (selectedIndex === DailyChartData.length - 1) {
            $('#btnHourlyNext').attr('disabled', 'disabled');
        }
        if (selectedIndex === 0) {
            $('#btnHourlyPrev').attr('disabled', 'disabled');
        }

        let startDate = selectedItem.split('-')[0];
        let api_url = `${Url}?StartDate=${startDate}&ResolutionCode=D`;

        $('#UsageHistoryDailyLoadingPanel').show();

        fetch(api_url, {
            method: 'GET',
            headers: {
                "Content-Type": "application/json",
                "Access_Token": Access_Token,
                "Is_Ajax_Request": true
            }
        }).then((response) => {
            if (response.status === 200) {
                response.json().then(function (data) {
                    if (data) {

                        $('#UsageHistoryDailyLoadingPanel').hide();
                        $('#UsageChartMonthlyDiv').hide();
                        $('#UsageChartDailyDiv').hide();
                        $('#UsageChartHourlyDiv').show();

                        $("#HourlyChart").data("kendoChart").dataSource.data(data);

                        $("#UsageHistoryHeader").html("Hourly Usage History");
                        $("#ZoomOutDiv").show();

                        $('#btnHourlyUsageGroup').show();
                        $('#btnDailyUsageGroup').hide();

                        $("#btnHourlyCurrent").html(selectedItem.split('-')[1]);
                    }
                });
            } else if (response.status === 400) {
                response.json().then(function (data) {
                }).catch((error) => { throw error });
            }
            else if (response.status === 401) {
                UnAuthorizedHandler.Handle401();
            }
            else if (response.status === 500) {

            }
        }).catch((error) => {
        }).finally(() => {
        })

    

    }
         
    function monthlychart_dataSource_requestEnd(e) {
        //check the "response" argument to skip the local operations
        if (e.type === "read" && e.response) {
            $('#UsageHistoryLoadingPanel').hide();
            $('#UsageHistoryChartPanel').show();
        }
    }

    function monthlychart_dataSource_change(e) {

        loadDataTable(e.items);

        var data = this.data();
        if (!data || data.length === 0) {
            $('#NoUsageHistoryPanel').show();
            $('#UsageHistoryChartPanel').hide();
        }
    }

    function monthlychart_dataSource_error(e) {
        let status = e.xhr.status;
        if (status === 400) {
            response.json().then(function (data) {
                console.log("Bad Request.. Try Again");
            }).catch((error) => { throw error });
        }
        else if (status === 401) {
            UnAuthorizedHandler.Handle401();
        }
        else if (status === 500) {
        }
    }
    /* montly chart */


    /* daily chart */
    function daily_chart_dataBound(e) {
        let chart = $("#DailyChart").data("kendoChart");
        for (var i = 0; i < chart.dataSource.view().length; i++) {
            DailyChartData[i] = chart.dataSource.view()[i].UsageDate + "-" + chart.dataSource.view()[i].EndDate
            DayNames[i] = chart.dataSource.view()[i].DailychartDay;
        }
    }

    function daily_chart_dataBound_SeriesClick(e) {

        var date = new Date(e.category);
        var newdate = (date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear();
        SelectedDay = e.dataItem.UsageDate + "-" + e.dataItem.EndDate;

        loadDailyChart(SelectedDay, (newdate + "-" + e.dataItem.DailychartDay));
    }
    /* daily chart */

    let init = function (urls) {
        Urls = urls;

        var dailyChart = $("#DailyChart").data("kendoChart");
        dailyChart.bind("dataBound", daily_chart_dataBound);
        dailyChart.bind("seriesClick", daily_chart_dataBound_SeriesClick);

        var montlyChart = $("#MonthlyChart").data("kendoChart");
        montlyChart.bind("dataBound", monthly_chart_dataBound);
        montlyChart.bind("seriesClick", monthly_chart_seriesClick);

        let montlyChartDataSource = montlyChart.dataSource;
        montlyChartDataSource.bind("error", monthlychart_dataSource_error);
        montlyChartDataSource.bind("change", monthlychart_dataSource_change);
        montlyChartDataSource.bind("requestEnd", monthlychart_dataSource_requestEnd);

        $('#btnZoom').click(function () {
            setMonthlyUsageGrid();
        });

        $('#btnDailyPrev').click(function () {
            let item = MonthlyChartData.find(x => x === SelectedMonth);
            if (item) {
                let selectedItemIndex = MonthlyChartData.indexOf(item);
                SelectedMonth = MonthlyChartData[selectedItemIndex - 1];
                loadMonthlyChart(SelectedMonth);
            }
        });

        $('#btnDailyNext').click(function () {
            let item = MonthlyChartData.find(x => x === SelectedMonth);
            if (item) {
                let selectedItemIndex = MonthlyChartData.indexOf(item);
                SelectedMonth = MonthlyChartData[selectedItemIndex + 1];
                loadMonthlyChart(SelectedMonth);
            }
        });

        $('#btnHourlyPrev').click(function () {
            let item = DailyChartData.find(x => x === SelectedDay);
            if (item) {
                let selectedItemIndex = DailyChartData.indexOf(item);
                SelectedDay = DailyChartData[selectedItemIndex - 1];
                loadDailyChart(SelectedDay, (SelectedDay.split('-')[0] + "-" + DayNames[selectedItemIndex - 1]));
            }
        });

        $('#btnHourlyNext').click(function () {
            let item = DailyChartData.find(x => x === SelectedDay);
            if (item) {
                let selectedItemIndex = DailyChartData.indexOf(item);
                SelectedDay = DailyChartData[selectedItemIndex + 1];
                loadDailyChart(SelectedDay, (SelectedDay.split('-')[0] + "-" + DayNames[selectedItemIndex + 1]));
            }
        });
    }

    function loadDataTable(usagehistory) {

        usagehistory = usagehistory.map(x => {
            return {
                KWH: x.KWH,
                AverageTemperature: x.AverageTemperature,
                StartDate: x.StartDate,
                EndDate: x.EndDate
            };
        })


        if (!usagehistory || usagehistory.length === 0) {
            return;
        }

        $('#UsageHistoryTable').show();

        let ColumnHeaders = [
            { title: 'Date', name: 'StartDate', sort: 'desc', type: 'date' },
            { title: 'kWh', name: 'KWH', sort: '', type: 'number' },
            { title: 'Temperature', name: 'AverageTemperature', sort: '', type: 'number' },
        ];

        let Config = {
            paging: true,
            sorting: { columnHeaders: ColumnHeaders },
        };

        function buildColumnHeaders() {
            let usagehistoryheadertemplate = $('#usageHistoryHeaderTemplate').html();
            $("#usageHistoryHeader").empty().html(Mustache.to_html(usagehistoryheadertemplate, { RootTag: ColumnHeaders }));
        }

        function sortByColumn(columnToSort) {

            const sorting = Object.assign({}, Config.sorting).columnHeaders;
            const sorted = sorting.map((columnHeader) => {
                if (columnToSort.name === columnHeader.name) {
                    const newSort = columnHeader.sort === 'asc'
                        ? 'desc'
                        : 'asc';
                    return Object.assign(columnHeader, { sort: newSort });
                } else {
                    return Object.assign(columnHeader, { sort: '' });
                }
            });

            const newConfig = Object.assign({}, Config, {
                sorting: { columns: sorted }
            });

            onChangeTable(newConfig);
        }
        
        function changeSort(data, config) {

            if (!config.sorting) {
                return data;
            }

            const columnHeaders = Config.sorting.columnHeaders || [];

            // get the first column by default that has a sort value
            const columnWithSort = columnHeaders.find((columnHeader) => {
                /* Checking if sort prop exists and column needs to be sorted */
                if (columnHeader.hasOwnProperty('sort') && columnHeader.sort !== '') {
                    return true;
                }
            });

            return data.sort((previous, current) => {

                if (columnWithSort.type === 'date') {
                    if (new Date(previous[columnWithSort.name] != null ? previous[columnWithSort.name] : new Date()) > new Date(current[columnWithSort.name] != null ? current[columnWithSort.name] : new Date())) {
                        return columnWithSort.sort === 'desc'
                            ? -1
                            : 1;
                    } else if (new Date(previous[columnWithSort.name] != null ? previous[columnWithSort.name] : new Date()) < new Date(current[columnWithSort.name] != null ? current[columnWithSort.name] : new Date())) {
                        return columnWithSort.sort === 'asc'
                            ? -1
                            : 1;
                    }

                } else if (columnWithSort.type === 'number') {

                    if (parseInt(previous[columnWithSort.name]) > parseInt(current[columnWithSort.name])) {
                        return columnWithSort.sort === 'desc'
                            ? -1
                            : 1;
                    } else if (parseInt(previous[columnWithSort.name]) < parseInt(current[columnWithSort.name])) {
                        return columnWithSort.sort === 'asc'
                            ? -1
                            : 1;
                    }
                }

                return 0;

            });
        }

        function onChangeTable(config, pageNumber) {

            if (config.sorting) {
                Object.assign(Config.sorting, config.sorting);
            }

            const sortedData = changeSort(usagehistory, Config);
            buildColumnHeaders();
            let usagehistorytemplate = $('#usageHistoryTemplate').html();
            $("#usageHistorytblBody").empty().html((Mustache.to_html(usagehistorytemplate, { RootTag: sortedData })));
        }

        $(document).on("click", '[id ^= "UsageHistoryColumn-"]', function () {

            let id = $(this).attr('id').split('UsageHistoryColumn-')[1];
            let columnHeaderToSort = ColumnHeaders.find(x => x.name === id);
            sortByColumn(columnHeaderToSort);
        });

        onChangeTable(Config);
    }

    return {
        Init: init,
        LoadEnergyInsightsUsageHistory: loadEnergyInsightsUsageHistory,
    };

})(jQuery);


function processApiData(data) {

    const months = {};
    for (const index in data) {
        if (data[index]) {
            if (!months[data[index].EndDate]) {
                months[data[index].EndDate] = {
                    avgTemperature: 0,
                    usage: 0,
                    date: moment(new Date(data[index].EndDate).toISOString(), moment.ISO_8601).toDate()
                };
            }
            months[data[index].EndDate].usage += parseInt(data[index].KWH);
            months[data[index].EndDate].avgTemperature += parseInt(data[index].AverageTemperature);
        }
    }
    return _.sortBy(_.values(months));
}
let HomeCarousel = (function ($) {

    let Urls;

    function resetUI() {
    }

    function loadCarousel(accountDetail) {

        let selectedAccount = accountDetail.SelectedAccountDetails;
        let paperless = selectedAccount.Paperless;

        // if not ready for renewal
        // remove the renewal slide.
        if (!selectedAccount.ReNew) {
            $("#home-carousel-component .carousel-item").eq(0).remove();
            $("#home-carousel-component .carousel-indicators li").eq(0).remove();
            $("#home-carousel-component .carousel-indicators li").eq(0).attr('data-slide-to', 0);
            $("#home-carousel-component .carousel-item").eq(0).addClass("active");
        }
        else {
            $("#home-carousel-component .carousel-indicators li").eq(0).attr('data-slide-to', 0);
            $("#home-carousel-component .carousel-item").eq(0).addClass("active");
            $("#home-carousel-component .carousel-item").eq(1).removeClass("active");
            $("#home-carousel-component .carousel-indicators li").eq(0).addClass('active');
            $("#home-carousel-component .carousel-indicators li").eq(1).removeClass('active');

        }

        // if already paperless
        // remove the paperless slide.
        if (paperless) {

            let carouselItemsCount = $("#home-carousel-component .carousel-item").length;
            let itemIndex = carouselItemsCount - 1;

            $("#home-carousel-component .carousel-item").eq(itemIndex).remove();
            $("#home-carousel-component .carousel-indicators li").eq(itemIndex).remove();
        }
    }

    let init = function (urls) {
        Urls = urls;
        resetUI();
    }

    return {
        Init: init,
        LoadCarousel: loadCarousel,
    };

})(jQuery);

let Login = (function ($) {

    let RegistrationUrl;
    let RegistrationPageHtml;
    let Brand;

    function loadRegistration() {
        let registrationPlaceholderElement = $('#registration-modal-placeholder');
        registrationPlaceholderElement.html(RegistrationPageHtml);
        registrationPlaceholderElement.find('.modal').modal('show');
        Registration.Init();
    }

    let init_V1 = function (registrationUrl) {

        // this is a first time login
        // clear any browser isolated storage or cached stuff.
        store.clearAll();

        RegistrationUrl = registrationUrl;
        $.get(RegistrationUrl).done(function (data) {

            RegistrationPageHtml = data;
            assingEventHandlers();

            const urlParams = new URLSearchParams(window.location.search);
            const pageParam = urlParams.get('page');
            if (pageParam && pageParam.toLowerCase() === 'register') {
                openRegistration();
            }

        });
    }

    function assingEventHandlers_v1() {

        $("#registerButton").click(function () {

            if (RegistrationPageHtml) {
                loadRegistration();
            } else {

                $.get(RegistrationUrl).done(function (data) {
                    let registrationPlaceholderElement = $('#registration-modal-placeholder');
                    registrationPlaceholderElement.html(data);
                    registrationPlaceholderElement.find('.modal').modal('show');
                    Registration.Init();
                });
            }
        });
    }

    function assignEventHandlers() {

        $("#registerButton").click(function () {
            openRegistration();
        });
    }

    function openRegistration() {

        let errorModalPlaceholderElement = $('#RegisterModal-placeholder');
        errorModalPlaceholderElement.find('.modal').modal({
            backdrop: 'static',
            keyboard: false,
            show: true
        });

        Registration.Init(Brand);
    }

    let init = function (registrationUrl, brand) {

        Brand = brand;

        // this is a first time login
        // clear any browser isolated storage or cached stuff.
        store.clearAll();

        RegistrationUrl = registrationUrl;

        assignEventHandlers();
        
        const urlParams = new URLSearchParams(window.location.search);
        const pageParam = urlParams.get('Page');
        if (pageParam) {
            openRegistration();
        }
    }

    return {
        Init: init
    };

})(jQuery);

let MakePayment = (function ($) {

    let Urls;
    let Brand;
    let PaymentUIIFrameUrl;
    let AccessToken;
    let Url;
    let SelectedAccount;
    let SessionId;
    let PostObject;
    let MakePaymentIframe;
    let SelectedAccountNumber;

    function resetUI() {
        $('#MakePaymentLoadingPanel').show();
        $('#MakePaymentPanel').hide();
        $('#MakePaymentErrorPanel').hide();
    }

    function loadMakePayment(accountDetail) {

        resetUI();

        AccessToken = accountDetail.SelectedAccount.split('*')[1];
        SelectedAccount = accountDetail.SelectedAccountDetails;
        SelectedAccountNumber = accountDetail.SelectedAccount.split('*')[0].split("-")[0];
        Url = `${Urls.getPaymentToken}`;

        fetch(Url, {
            method: 'GET',
            headers: {
                "Content-Type": "application/json"
            },
        }).then((response) => {
            if (response.status === 200) {
                response.json().then(function (data) {
                    if (data) {

                        // build the request payload to post to iframe
                        let sessionId = SessionId = data.SessionId;
                        PostObject = {
                            SessionId: sessionId,
                            CustomerNumber: SelectedAccount.Customer_Number,
                            CustomerAccountId: SelectedAccount.CustomerAccountId,
                            AccountStatus: SelectedAccount.AccountStatus,
                            ConnectStatus: SelectedAccount.ConnectStatus,
                            PastDue: SelectedAccount.PastDue,
                            CurrentBalance: SelectedAccount.CurrentBalance,
                            IsAutoPay: SelectedAccount.Auto_Pay,
                            LastInvoiceDueDate: SelectedAccount.LastInvoiceDueDate,
                            IsInsertPCILog: "1",
                            PastDueDisplayValue: SelectedAccount.PastDueDisplayValue,
                            CurrentBalaceDisplayValue: SelectedAccount.CurrentBalaceDisplayValue,
                            FirstName: $('#FirstNameHidden').val(),
                            LastName: $('#LastNameHidden').val(),
                            Email: SelectedAccount.Email,
                            ContactNumber: SelectedAccount.Cell
                        };

                        if (!PostObject.ContactNumber) {
                            ContactNumber: SelectedAccount.Phone;
                        }

                        // set the source to iframe.
                        document.getElementById('MakePaymentIFrame').src = `${PaymentUIIFrameUrl}MakePayment?Brand=${Brand}`;

                        // REVESIT DONT DELETE. DUE to CORS policy
                        // This code will not work but use it as reference.
                        // every 100 ms check if the document is the new one
                        // let oldDoc = makePaymentIframe.contentDocument;
                        //let timer = setInterval(() => {
                        //    //let newDoc = makePaymentIframe.contentDocument;
                        //    //if (newDoc == oldDoc) return;
                        //    // Check if loading is complete
                        //    var iframeDoc = makePaymentIframe.contentDocument || makePaymentIframe.contentWindow.document;
                        //    if (iframeDoc.readyState == 'complete') {
                        //        makePaymentIframe.contentWindow.onload = function () {
                        //            console.log("Make A Payment is Loaded");
                        //        };
                        //        // The loading is complete, call the function we want executed once the iframe is loaded
                        //        console.log("do your work here");
                        //        clearInterval(timer); // cancel setInterval, don't need it any more
                        //        return;
                        //    }
                        //}, 100);
                    }
                    else {

                    }
                });
            } else if (response.status === 400) {
                response.json().then(function (data) {
                }).catch((error) => { throw error });
            }
            else if (response.status === 500) {

            }
        }).catch((error) => {
        }).finally(() => {

        })
    }

    let init = function (urls, brand, paymentUIIFrameUrl) {

        Urls = urls;
        Brand = brand;
        PaymentUIIFrameUrl = paymentUIIFrameUrl

        // post to iframe.
        const iframe = document.querySelector('#MakePaymentIFrame');
        iframe.onload = () => {
            // REVISIT
            //var makePaymentIframe = $('#MakePaymentIFrame')[0];
            //makePaymentIframe.contentWindow.postMessage(postObject, '*');
        }

        $('#MakePaymentIFrame').on('load', () => {
            // Here's how you'd do this with jQuery
        });

        function iframePostHandler(evt) {

            if (evt && evt.data) {

                MakePaymentIframe = $('#MakePaymentIFrame')[0];

                if (evt.data.Redirect === 'ViewMyBill') {
                    window.location.href = '/Payments/ViewMyBill';
                }

                if (evt.data.ReLoadCallback) {

                    let url = `${Urls.getAccountDetailsUrl}?accessToken=${AccessToken}`;
                    fetch(url, {
                        method: 'GET',
                        headers: {
                            "Content-Type": "application/json"
                        },
                    }).then((response) => {
                        if (response.status === 200) {
                            response.json().then(function (data) {
                                if (data) {

                                    PostObject = {
                                        SessionId: SessionId,
                                        CustomerNumber: data.Customer_Number,
                                        CustomerAccountId: data.CustomerAccountId,
                                        AccountStatus: data.AccountStatus,
                                        ConnectStatus: data.ConnectStatus,
                                        PastDue: data.PastDue,
                                        CurrentBalance: data.CurrentBalance,
                                        IsAutoPay: data.Auto_Pay,
                                        LastInvoiceDueDate: data.LastInvoiceDueDate,
                                        IsInsertPCILog: "1",
                                        PastDueDisplayValue: data.PastDueDisplayValue,
                                        CurrentBalaceDisplayValue: data.CurrentBalaceDisplayValue,
                                        FirstName: $('FirstNameHidden').val(),
                                        LastName: $('LastNameHidden').val(),
                                        Email: data.Email,
                                        ContactNumber: data.Cell,
                                        MakePaymentResponseCallback: true
                                    };

                                    if (!PostObject.ContactNumber) {
                                        ContactNumber: data.Phone;
                                    }

                                    MakePaymentIframe.contentWindow.postMessage(PostObject, '*');
                                }
                            });
                        } else if (response.status === 400) {
                            response.json().then(function (data) {
                            }).catch((error) => { throw error });
                        }
                        else if (response.status === 500) {
                        }
                    }).catch((error) => {
                    }).finally(() => {
                    })
                }

                if (evt.data.height) {
                    if (MakePaymentIframe.contentWindow === evt.source) {
                        MakePaymentIframe.height = evt.data.height + "px";
                        MakePaymentIframe.style.height = evt.data.height + "px";
                    }
                }

                if (evt.data.Loaded) {
                    const timeValue = setInterval((interval) => {
                        if (PostObject) {
                            clearInterval(timeValue);
                            MakePaymentIframe.contentWindow.postMessage(PostObject, '*');

                            // alert(makePaymentIframe.contentWindow.document.body.scrollHeight);
                            // makePaymentIframe.height = makePaymentIframe.contentWindow.document.body.scrollHeight + "px";
                        }
                    }, 200);
                }

                if (evt.data.INSERTPCI) {

                    let request = {
                        ChildId: evt.data.ChildUniqueId,
                        PCISessionId: evt.data.PCISessionId,
                        SelectedAccountNumber: SelectedAccountNumber,
                        InsertPCITransactionUrl: `${Urls.insertPCITransaction}`,
                        AccessToken: AccessToken,
                        Url: `${Urls.validatePCITransactionLog}`,
                    };

                    PaymentsHelper.ValidatePCITransaction(request, () => {
                        $('#MakePaymentErrorPanel').hide();
                        $('#MakePaymentLoadingPanel').hide();
                        $('#MakePaymentPanel').show();

                    }, () => {
                        $('#MakePaymentLoadingPanel').hide();
                        $('#MakePaymentPanel').hide();
                        $('#MakePaymentErrorPanel').show();
                    });
                }

                if (evt.data.NotifyPaymentTransaction) {

                    let insertData = evt.data;
                    let request = {
                        Url: `${Urls.insertTransaction}`,
                        AccessToken: AccessToken,
                        Amount: insertData.Amount,
                        MethodName: insertData.MethodName,
                        objPmtResp: {
                            PurchaseAmount: insertData.PurchaseAmount,
                            TaxAmount: insertData.TaxAmount,
                            Rate: insertData.Rate,
                            KWHPurchased: insertData.KWHPurchased,
                            AuthCode: insertData.AuthCode,
                            orionResult: insertData.orionResult,
                            profileStatusCode: insertData.profileStatusCode,
                            profileStatusMessage: insertData.profileStatusMessage,
                        }
                    };

                    PaymentsHelper.InsertTransaction(request, () => {
                        // transaction log inserted....
                    }, () => {
                    });
                }
            }
        }

        if (window.addEventListener) {
            window.addEventListener("message", iframePostHandler, false);
        }
        else {
            window.attachEvent("onmessage", iframePostHandler);
        }
    }

    return {
        Init: init,
        LoadMakePayment: loadMakePayment,
    };

})(jQuery);

let MyBill = (function ($) {

    let Urls;

    function resetUI() {

        $('#myBillLoadingPanel').show();
        $('#suspendedAccountPanel').hide();
        $('#activeServiceAccountPanel').hide();

        $('#PastDueExistsPanel').hide();
        $('#LatestPaymentPanel').hide();

        $('#PastDuePayNowPanel').hide();
        $('#PaymentPendingPanel').hide();
        $('#AutoPayPanel').hide();
        $('#PaymentScheduledPanel').hide();
        $('#MakePaymentPanel').hide();

        $('#PaymentScheduledLabel').text();
        $('#AutoPayLabel').text();
        $('#PaymentPendingPanelLabel').text();

    }

    function loadMyBill(accountDetail) {

        resetUI();
        
        let selectedAccount = accountDetail.SelectedAccountDetails;

        $('#myBillLoadingPanel').hide();
        $('#myBillPanel').show();

        if (selectedAccount.AccountStatus.toLowerCase() === "suspended") {
            $('#suspendedAccountPanel').show();
        }

        $('#activeServiceAccountPanel').show()

        let totalDue = parseFloat(selectedAccount.TotalDue);

        if ((selectedAccount.IsPastDue || (selectedAccount.TotalDue && totalDue > 0))
            && selectedAccount.HasAtleastOnePayment) {
            $('#PastDueExistsPanel').show();
            $('#DueDate').text(selectedAccount.LatestInvoiceDueDate);
        }

        if (!selectedAccount.IsPastDue
            && selectedAccount.HasAtleastOnePayment
            && totalDue <= 0) {
            $('#LatestPaymentPanel').show();
            $('#LatestBillAmount').text(selectedAccount.LastPaymentAmountDisplayValue);
            $('#LatestBillPaymentDate').text(selectedAccount.LastPaymentDateDisplayValue);
        }

        if (selectedAccount.IsPastDue) {
            $('#myBillHeading').addClass('exceededDueDate');
            $('#paymentBtn').addClass('exceededDueDate');
        } else {
            $('#myBillHeading').addClass('paymentMade');
            $('#paymentBtn').addClass('paymentMade');
        }

        $('#TotalDueLabel').text(selectedAccount.TotalDueDisplayValue);
        $('#CurrentDueLabel').text(selectedAccount.CurrentBalaceDisplayValue);
        $('#PastDueLabel').text(selectedAccount.PastDueDisplayValue);

        if (selectedAccount.MyBillDisplayView) {
            switch (selectedAccount.MyBillDisplayView) {
                case "PastDuePayNow":
                    $('#PastDuePayNowPanel').show();
                    break;
                case "PaymentPending":
                    {
                        $('#PaymentPendingPanel').show();
                        if (!selectedAccount.Auto_Pay) {
                            $('#PaymentPendingPanelLabel').show();
                            $('#PaymentPendingPanelLabel').html(`Your payment of ${selectedAccount.LastPaymentAmountDisplayValue} is received`);
                        }
                    }
                    break;
                case "AutoPay":
                    {
                        $('#AutoPayPanel').show();
                        if (selectedAccount.ScheduledAutoBillPaymentDateDisplayValue) {
                            $('#AutoPayLabel').text(`Auto Pay is scheduled for </br> ${selectedAccount.ScheduledAutoBillPaymentDateDisplayValue}`);
                        }
                        else {
                            $('#AutoPayLabel').text('Auto Pay is scheduled for your next payment date');
                        }
                    }
                    break;
                case "PaymentScheduled":
                    {
                        $('#PaymentScheduledPanel').show();
                        $('#PaymentScheduledLabel').text(`Your payment of ${selectedAccount.LastPaymentAmountDisplayValue} is is scheduled for ${selectedAccount.ScheduledAutoBillPaymentDateDisplayValue}`);
                    }
                    break;
                case "MakePayment":
                    {
                        $('#MakePaymentPanel').show();
                    }
                    break;
                default:
                    $('#MakePaymentPanel').show();
                // code block
            }
        }
    }

    let init = function (urls) {
        Urls = urls;
    }

    return {
        Init: init,
        LoadMyBill: loadMyBill,
    };

})(jQuery);

let NyServicePlans = (function ($) {

    let Urls, Access_Token;

    let ctx;
    let myChart;

    let chartType;
    let chartTimestamp = null;
    let clearIsDone = false;
    let clearTimeoutT = null;

    function resetUI() {

        $('#MyServicePlanLoadingPanel').show();
        $('#MyServicePlanPanel').hide();

        $('#RenewPlanInfoPanel').hide();
        $('#CurrentPlanInfoPanel').hide();

        $('#PendingRenewalPlanPanel').hide();
        $('#RenewalPlanPanel').hide();
        $('#CurrentPlanPanel').hide();
        $('#HoldOverPlanPanel').hide();

        $('#CurrentPlanDocuments').hide();
        $('#RenewalViewCurrentViewPanel').hide();

    }

    function IDGenerator() {

        this.length = 8;
        this.timestamp = +new Date;

        let _getRandomInt = function (min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }

        this.generate = function () {
            let ts = this.timestamp.toString();
            let parts = ts.split("").reverse();
            let id = "";

            for (var i = 0; i < this.length; ++i) {
                var index = _getRandomInt(0, parts.length - 1);
                id += parts[index];
            }

            return id;
        }
    }

    function loadMyServicePlans(accountDetail) {

        debugger;

        resetUI();
        Access_Token = accountDetail.SelectedAccount.split('*')[1];
        SelectedAccountNumber = accountDetail.SelectedAccount.split('*')[0].split("-")[0];
        let contractType = accountDetail.SelectedAccountDetails.ContractType;
        let SelectedCustomerAccountId = accountDetail.SelectedAccount.split('*')[0].split("-")[1];

        let getCurrentPlanInfoUrl = `${Urls.getCurrentPlanInfo}?CustomerAccountId=${SelectedCustomerAccountId}`;
        fetch(getCurrentPlanInfoUrl, {
            method: 'GET',
            headers: {
                "Content-Type": "application/json",
                "Access_Token": Access_Token,
                "Is_Ajax_Request": true
            },
        }).then((response) => {
            if (response.status === 200) {
                response.json().then(function (data) {

                    if (data) {

                        $('#RenewPlanInfoPanel').hide();
                        $('#CurrentPlanInfoPanel').show();

                        let currentPlan = data.CurrentPlan;
                        let renewedPlan = data.RenewedPlan;

                        let currentPanel = "CURRENTPLAN";
                        currentPanel = 'RENEWPLAN';
                        /*currentPanel = 'RENEWEDPLAN'
                        currentPanel = 'MTM';*/

                        if (accountDetail.SelectedAccountDetails.Renew) {
                            currentPanel = 'RENEWPLAN'
                        } else if (currentPlan.ContractTerm == 1) {
                            currentPanel = 'MTM';
                        } else {
                            currentPanel = "CURRENTPLAN";
                        }

                        $('#AccountNumberDisplay').html(SelectedAccountNumber);

                        if (currentPanel === 'CURRENTPLAN') {

                            $('#CurrentPlanPanel').show();
                            $('#CurrentPlanProductName').html(data.CurrentPlan.ProductTitle);
                            $('#CurrentPlanRate').html(parseFloat(data.CurrentPlan.EFLRate).toFixed(1));
                            $('#CurrentPlanRateAt').html(data.CurrentPlan.EFLRateAt);
                            $('#CurrentPlanTerm').html(data.CurrentPlan.ContractTerm);
                            $('#CurrentPlanStartDate').html(accountDetail.SelectedAccountDetails.ContractStartDate);
                            $('#CurrentPlanEndDate').html(accountDetail.SelectedAccountDetails.ContractEndDate);

                            // My Current Plan
                            $('#MyCurrentPlanInfoMainBtn').popover({
                                html: true,
                                container: "body",
                                sanitize: false,
                                content: function () {

                                    let inputData = {

                                        Name: 'John',
                                        PlanName: currentPlan.ProductTitle + ' (Current plan)',
                                        EFLLink: currentPlan.EFLLink,
                                        TOSLink: currentPlan.TOSLink,
                                        YRAACLink: currentPlan.YRAACLink,
                                        EFLRate: currentPlan.EFLRate,
                                        EFLRateAt: currentPlan.EFLRateAt,
                                        ContractTerm: currentPlan.ContractTerm,
                                        MonthlyFee: currentPlan.MonthlyFee,
                                        ETFCharge: currentPlan.ETFCharge ? currentPlan.ETFCharge : 150,
                                        PricePlanScript: currentPlan.PricePlanScript,
                                        Id: "MyCurrentPlanInfoMain",
                                        ButtonId: 'planinfopopover-MyCurrentPlanInfoMainBtn'
                                    };

                                    let planinfopopovertemplate = $('#planinfopopovertemplate').html();
                                    return (Mustache.to_html(planinfopopovertemplate, inputData));
                                }
                            });

                            $('#CurrentPlanDocuments').show();
                            $('#CurrentPlanTOSDocument').attr("href", data.CurrentPlan.TOSLink);
                            $('#CurrentPlanEFLDocument').attr("href", data.CurrentPlan.EFLLink);
                            $('#CurrentPlanYRAACDocument').attr("href", data.CurrentPlan.YRAACLink);

                        } else if (currentPanel === 'RENEWPLAN') {

                            $('#RenewPlanInfoPanel').show();
                            $('#CurrentPlanInfoPanel').hide();

                            $('#RenewPlanAccountNumberDisplay').html(SelectedAccountNumber);
                            $('#RenewPlanContractEndDate').html(accountDetail.SelectedAccountDetails.ContractEndDate);

                            $('#CurrentPlanDocuments').hide();
                            $('#RenewalViewCurrentViewPanel').show();

                            $('#RenewalPlanPanel').show();
                          
                            // current info Plan
                            $('#RenewalViewCurrentPlanInfoBtn').popover({
                                html: true,
                                container: "body",
                                sanitize: false,
                                content: function () {
                                    let inputData = {

                                        Name: 'John',
                                        PlanName: currentPlan.ProductTitle + ' (Current plan)',
                                        EFLLink: currentPlan.EFLLink,
                                        TOSLink: currentPlan.TOSLink,
                                        YRAACLink: currentPlan.YRAACLink,
                                        EFLRate: currentPlan.EFLRate,
                                        EFLRateAt: currentPlan.EFLRateAt,
                                        ContractTerm: currentPlan.ContractTerm,
                                        MonthlyFee: currentPlan.MonthlyFee,
                                        ETFCharge: currentPlan.ETFCharge ? currentPlan.ETFCharge : 150,
                                        PricePlanScript: currentPlan.PricePlanScript,
                                        ButtonId: 'planinfopopover-RenewalViewCurrentPlanInfoBtn',
                                        Id: "RenewalViewCurrentPlanInfo"
                                    };

                                    let planinfopopovertemplate = $('#planinfopopovertemplate').html();
                                    return (Mustache.to_html(planinfopopovertemplate, inputData));
                                }
                            });
                        } else if (currentPanel === 'RENEWEDPLAN') {

                            $('#PendingRenewalPlanPanel').show();

                            $('#PendingRenewalProductName').html(renewedPlan.ProductTitle);
                            $('#PendingRenewalPlanRate').html(parseFloat(renewedPlan.EFLRate).toFixed(1));
                            $('#PendingRenewalPlanTerm').html(renewedPlan.ContractTermCode);

                            $('#PendingRenewalPlanStartDate').html('02/25/2020');
                            $('#PendingRenewalPlanEndDate').html('02/25/2021');

                            $('#CurrentPlanDocuments').hide();
                            $('#RenewalViewCurrentViewPanel').show();

                            // Pending Renewal Plan Display
                            $('#PendingRenewalPlanInfoBtn').popover({
                                html: true,
                                container: "body",
                                sanitize: false,
                                content: function () {
                                    let inputData = {
                                        Name: 'John',
                                        PlanName: renewedPlan.ProductTitle,
                                        EFLLink: renewedPlan.EFLLink,
                                        TOSLink: renewedPlan.TOSLink,
                                        YRAACLink: renewedPlan.YRAACLink,
                                        EFLRate: renewedPlan.EFLRate,
                                        EFLRateAt: renewedPlan.EFLRateAt,
                                        ContractTermCode: renewedPlan.ContractTermCode,
                                        MonthlyFee: renewedPlan.MonthlyFee,
                                        ETFCharge: renewedPlan.ETFCharge,
                                        Id: "PendingRenewalPlanInfo",
                                        ButtonId: 'planinfopopover-PendingRenewalPlanInfoBtn'
                                    };

                                    let planinfopopovertemplate = $('#planinfopopovertemplate').html();
                                    return (Mustache.to_html(planinfopopovertemplate, inputData));
                                }
                            });

                            // pending renewal current plan info..
                            $('#PendingRenewalPlanCurrentPlanInfoBtn').popover({
                                html: true,
                                container: "body",
                                sanitize: false,
                                content: function () {
                                    let inputData = {
                                        Name: 'John',
                                        PlanName: currentPlan.ProductTitle + ' (Current plan)',
                                        EFLLink: currentPlan.EFLLink,
                                        TOSLink: currentPlan.TOSLink,
                                        YRAACLink: currentPlan.YRAACLink,
                                        EFLRate: currentPlan.EFLRate,
                                        EFLRateAt: currentPlan.EFLRateAt,
                                        ContractTerm: currentPlan.ContractTerm,
                                        MonthlyFee: currentPlan.MonthlyFee,
                                        ETFCharge: currentPlan.ETFCharge ? currentPlan.ETFCharge : 150,
                                        PricePlanScript: currentPlan.PricePlanScript,
                                        Id: "PendingRenewalPlanCurrentPlanInfo",
                                        ButtonId: 'planinfopopover-PendingRenewalPlanCurrentPlanInfoBtn'
                                    };
                                    let planinfopopovertemplate = $('#planinfopopovertemplate').html();
                                    return (Mustache.to_html(planinfopopovertemplate, inputData));
                                }
                            });

                        } else if (currentPanel === 'MTM') {

                            $('#HoldOverPlanPanel').show();
                            $('#MonthToMonthPlanProductName').html(currentPlan.ProductTitle);
                            $('#MonthToMonthPlanStartDate').html('01/21/2020');

                            $('#CurrentPlanDocuments').show();
                            $('#RenewalViewCurrentViewPanel').hide();

                            // Holdover Plan
                            $('#HoldOverPlanBtn').popover({
                                html: true,
                                container: "body",
                                sanitize: false,
                                content: function () {
                                    let inputData = {
                                        Name: 'John',
                                        PlanName: currentPlan.ProductTitle,
                                        EFLLink: currentPlan.EFLLink,
                                        TOSLink: currentPlan.TOSLink,
                                        YRAACLink: currentPlan.YRAACLink,
                                        EFLRate: currentPlan.EFLRate,
                                        EFLRateAt: currentPlan.EFLRateAt,
                                        ContractTerm: currentPlan.ContractTerm,
                                        MonthlyFee: currentPlan.MonthlyFee,
                                        ETFCharge: currentPlan.ETFCharge ? currentPlan.ETFCharge : 150,
                                        PricePlanScript: currentPlan.PricePlanScript,
                                        Id: "HoldOverPlanInfo",
                                        ButtonId: 'planinfopopover-HoldOverPlanBtn'
                                    };

                                    let planinfopopovertemplate = $('#planinfopopovertemplate').html();
                                    return (Mustache.to_html(planinfopopovertemplate, inputData));
                                }
                            });

                            $('#CurrentPlanTOSDocument').attr("href", data.CurrentPlan.TOSLink);
                            $('#CurrentPlanEFLDocument').attr("href", data.CurrentPlan.EFLLink);
                            $('#CurrentPlanYRAACDocument').attr("href", data.CurrentPlan.YRAACLink);

                        }

                        ctx = document.getElementById("myChart");
                        myChart = new Chart(ctx, {
                            type: 'pie',
                            data: {
                                datasets: [{
                                    data: [0, 0, 0, 0],
                                    backgroundColor: [
                                        'rgba(6,81,128,1.0)',
                                        'rgba(46,177,52,1.0)',
                                        'rgba(254,162,32,1.0)',
                                        'red'
                                    ],
                                    borderWidth: 1
                                }]
                            },
                            options: {
                                cutoutPercentage: 85,
                                responsive: true,
                                maintainAspectRatio: false,
                                legend: {
                                    display: false
                                },
                                tooltips: {
                                    callbacks: {
                                        label: (tooltipItem) => {

                                            if (chartType === 'holdover') {
                                                return 'Plan Time Remaining';
                                            }

                                            if (chartType === 'renewal') {
                                                return 'Plan Time Remaining';
                                            }

                                            return [
                                                ' Plan Time Used',
                                                ' Plan Time Remaining',
                                                ' 30 Day Reminder',
                                                ' 15 Day Reminder'
                                            ][tooltipItem.index];
                                        }
                                    }
                                }
                            }
                        });

                        let existingRenewal = false;

                        if (contractType === 'MTM') {
                            buildHoldoverChart();
                        } else if (existingRenewal) {
                            buildRenewedChart(
                                new Date('12/26/2019')
                            );
                        } else {
                            buildChart(
                                new Date('11/15/2019'),
                                new Date('11/15/2020')
                            );
                        }

                        return;
































                    }


                });

            } else if (response.status === 400) {
                response.json().then(function (data) {
                }).catch((error) => { throw error });
            }
            else if (response.status === 500) {

            }
        }).catch((error) => {
        }).finally(() => {
            $('#MyServicePlanLoadingPanel').hide();
            $('#MyServicePlanPanel').show();
            $('.myServiceRenewUpgradePlansList').show();
        })
    }


    let init = function (urls) {
        Urls = urls;

        //$("[data-toggle=popover]").popover({
        //    html: true,
        //    sanitize: false,
        //    content: function () {
        //        var content = $(this).attr("data-popover-content");
        //        return $(content).children(".popover-body").html();
        //    }
        //});

        $('[data-toggle="tooltip"]').tooltip();

        $("#myCurrentPlanInfo").popover({
            html: true,
            sanitize: false,
            content: function () {
                var content = $(this).attr("data-popover-content");
                return $(content).children(".popover-body").html();
            }
        });

        $(document).on('click', '.current-plan-info-close-popover', function () {
            $('#myCurrentPlanInfo').popover('hide');
        });




        $(document).on('click', '[id ^= "planinfopopover-"]', function () {
            var id = $(this).attr('id').split('planinfopopover-')[1];
            $(`#${id}`).popover('hide');
        });
     
        $(window).resize(function () {

            console.log(myChart.width);

            ////  document.getElementById('gaugeText').height = `${myChart.height}px`;
            //// buildHoldoverChart();
        });

    }

    // use this function to set the featured plan
    // to be displayed if elibgible for renewal.
    let setFeaturedPlan = function (featuredPlan) {

        let generator = new IDGenerator();
        featuredPlan = JSON.parse(JSON.stringify(featuredPlan));
        featuredPlan.Id = generator.generate();

        if (featuredPlan) {
            let featurdPlanTemplate = $('#featuredPlanCardTemplate').html();
            $('#FeaturedOfferPanel').empty().html(Mustache.to_html(featurdPlanTemplate, { RootTag: featuredPlan }));
        }
    }

    function fix_dpi(canvas, dpi) {
        let style = {
            height() {
                return +getComputedStyle(canvas).getPropertyValue('height').slice(0, -2);
            },
            width() {
                return +getComputedStyle(canvas).getPropertyValue('width').slice(0, -2);
            }
        }
        canvas.setAttribute('width', style.width() * dpi);
        canvas.setAttribute('height', style.height() * dpi);
    }

    // test code..
    function draw() {
        //call the dpi fix every time 
        //canvas is redrawn
        fix_dpi();

        //draw stuff!
        ctx.strokeRect(30, 30, 100, 100);
        ctx.font = "30px Arial";
        ctx.fillText("Demo!", 35, 85);
        requestAnimationFrame(draw);
    }

    function buildRenewedChart(startDate) {
        chartType = 'renewed';
        clearFirst(() => {

            // Keep aside a timestamp to tell if we've stopped the later animation.
            const timestamp = chartTimestamp = new Date();

            // Show a completely green chart.
            myChart.data.datasets[0].data = [0, 1, 0, 0];
            myChart.update();

            // Calculate the amount of days between now and the start date of the new contract.
            const startDateTime = startDate.getTime();
            const currentTime = (new Date()).getTime();
            const daysLeft = Math.round(Math.abs((startDateTime - currentTime) / (24 * 60 * 60 * 1000)));

            try {

                const gaugeText = getTextCanvas();

                gaugeText.font = '60pt sans-serif';
                gaugeText.fillStyle = 'rgba(46,177,52,1.0)';
                gaugeText.fillText('Until your', 500, 560);
                gaugeText.fillText('new plan starts', 500, 645);

                gaugeText.fillStyle = 'black';
                gaugeText.font = 'bold 45pt sans-serif';
                gaugeText.fillText('Only', 500, 230);
                gaugeText.font = 'bold 100pt sans-serif';

                const renderDays = (day) => {
                    // Continue only if the this component's chartTimestamp is still this scope's timestamp.
                    // If this condition is no longer met then another chart has been started for another activated service account.
                    if (timestamp === chartTimestamp) {
                        gaugeText.clearRect(0, 315, 1000, 150);
                        gaugeText.fillText(`${day} Day${daysLeft === 1 ? '' : 's'}`, 500, 420);

                        if (++day <= daysLeft) {
                            requestAnimationFrame(() => renderDays(day));
                        }
                    }
                };

                renderDays(0);

            } catch (e) {
                // If thrown, the browser likely does not support the HTML5 canvas API/object.
                console.error(e);
            }
        });
    }

    function buildChart(contractStartDate, contractEndDate) {

        chartType = 'standard';
        clearFirst(() => {

            const currentDate = new Date();
            const timestamp = chartTimestamp = new Date;

            const startDateTime = contractStartDate.getTime();
            const todayTime = currentDate.getTime();
            const endDateTime = contractEndDate.getTime();
            const aDay = 24 * 60 * 60 * 1000;

            console.log('arguments', contractStartDate, currentDate, contractEndDate);

            const totalDaysOfContract = Math.round(Math.abs((endDateTime - startDateTime) / aDay));
            const totalDaysUsed = Math.round(Math.abs((todayTime - startDateTime) / aDay));
            const totalTimeRemaining = totalDaysOfContract - totalDaysUsed;
            const percentageOfTimeRemaining = Math.round((totalTimeRemaining * 100) / totalDaysOfContract);
            const renewalWindow = 30;

            // Warning: Don't Delete the following comments.
            // Hard-code in values for testing.
            // const totalDaysOfContract = 360;
            // const totalDaysUsed = 360;
            // let totalTimeRemaining = totalDaysOfContract - totalDaysUsed;
            // const percentageOfTimeRemaining = Math.round((totalTimeRemaining * 100) / totalDaysOfContract);
            // const renewalWindow = 30; 
            //totalTimeRemaining = 65;

            if (totalTimeRemaining <= renewalWindow - 15) {
                // 15 days or less remain - show blue bar touching the red.
                myChart.data.datasets[0].data = [95, 0, 0, 5];
                myChart.update();
            } else if (totalTimeRemaining <= renewalWindow) {
                // 30 days or less remain - show blue bar touching the yellow and red.
                myChart.data.datasets[0].data = [95, 0, 5, 5];
                myChart.update();
            } else {
                // Plenty of time remains - show a weighted percentage of the blue vs green bars.
                const preRenewalWindow = totalDaysOfContract - renewalWindow;
                const weightedUsed = Math.round((totalDaysUsed * 90) / preRenewalWindow);
                myChart.data.datasets[0].data = [weightedUsed, (90 - weightedUsed), 5, 5];
                myChart.update();
            }

            try {

                const gaugeText = getTextCanvas();

                // Print out the message according to the short-term window.
                gaugeText.font = '50pt sans-serif';
                gaugeText.fillStyle = 'rgba(46,177,52,1.0)';
                if (totalTimeRemaining <= 30) {
                    gaugeText.fillText('Lock in A', 500, 610);
                    gaugeText.fillText('New Fixed Rate!', 500, 695);
                } else if (totalTimeRemaining <= 90) {
                    gaugeText.fillText('It’s Time To', 500, 610);
                    gaugeText.fillText('Renew Your Plan!', 500, 695);
                } else {
                    gaugeText.fillText('Your Plan is in', 500, 610);
                    gaugeText.fillText('Good Shape!', 500, 695);
                }

                gaugeText.fillStyle = 'black';
                if (totalTimeRemaining <= 30) {
                    gaugeText.font = 'bold 40pt sans-serif';
                    gaugeText.fillText(`Day${totalTimeRemaining === 1 ? '' : 's'} of Your`, 500, 450);
                    gaugeText.fillText('Contract Remaining', 500, 500);

                    gaugeText.font = 'bold 150pt sans-serif';
                    const renderDays = (day) => {
                        // Continue only if the this component's chartTimestamp is still this scope's timestamp.
                        // If this condition is no longer met then another chart has been started for another activated service account.
                        if (timestamp === chartTimestamp) {
                            gaugeText.clearRect(0, 125, 1000, 250);
                            gaugeText.fillText(`${day}`, 500, 325);

                            if (++day <= totalTimeRemaining) {
                                // Using setTimeout because requestAnimationFrame may be too fast.
                                setTimeout(() => renderDays(day), 75);
                            }
                        }
                    };
                    renderDays(0);
                } else {
                    gaugeText.font = 'bold 150pt sans-serif';
                    gaugeText.fillText(`${percentageOfTimeRemaining}%`, 500, 350);

                    gaugeText.font = 'bold 40pt sans-serif';
                    gaugeText.fillText('of Contract Time', 500, 450);
                    gaugeText.fillText('Remaining', 500, 500);
                }
            } catch (e) {
                // If thrown, the browser likely does not support the HTML5 canvas API/object.
                console.error(e);
            }
        });
    }

    function buildHoldoverChart() {

        chartType = 'holdover';
        clearFirst(() => {

            // Show a completely green chart.
            myChart.data.datasets[0].data = [0, 1, 0, 0];
            myChart.update();

            try {

                let canvas = document.getElementById('gaugeText'),
                    ctx = canvas.getContext('2d'),
                    dpi = window.devicePixelRatio;
                const gaugeText = getTextCanvas();
                // fix_dpi(canvas, dpi);

                //gaugeText.fillStyle = 'black';
                //gaugeText.font = 'bold 30pt sans-serif';
                //gaugeText.fillText('All Set!', 145, 130);

                //gaugeText.font = '50pt sans-serif';
                //gaugeText.fillStyle = 'rgba(46,177,52,1.0)';
                //gaugeText.fillText('No Expiration Date', 500, 520);
                //gaugeText.fillText('on your plan', 500, 610);



                gaugeText.fillStyle = 'black';
                gaugeText.font = 'bold 100pt sans-serif';
                gaugeText.fillText('All Set!', 500, 475);

                gaugeText.font = '50pt sans-serif';
                gaugeText.fillStyle = 'rgba(46,177,52,1.0)';
                gaugeText.fillText('No Expiration Date', 500, 580);
                gaugeText.fillText('on your plan', 500, 670);

            } catch (e) {
                // If thrown, the browser likely does not support the HTML5 canvas API/object.
                console.error(e);
            }
        });
    }

    function clearFirst(callback) {

        // If we haven't yet drawn any charts, have no delay on the initial.
        const delay = clearIsDone === null ? 0 : 1000;

        chartTimestamp = null;
        clearIsDone = false;

        // Stop any previous jobs/timeouts.
        if (clearTimeoutT) {
            clearTimeout(clearTimeoutT);
        }

        // Clear the doughnut chart (starting its' animation.)
        myChart.data.datasets[0].data = [0, 0, 0, 0];
        myChart.update();

        // Try to clear the gauge's text.
        try {
            getTextCanvas();
        } catch (e) {
            // If thrown, the browser likely does not support the HTML5 canvas API/object.
            console.error(e);
        }

        // Run the callback after the delay (once the animation has finished.)
        clearTimeoutT = setTimeout(() => {
            clearIsDone = true;
            if (_.isFunction(callback)) {
                callback();
            }
        }, delay);
    }

    function getTextCanvas() {

        const gaugeText = document.getElementById('gaugeText').getContext('2d');
        gaugeText.clearRect(0, 0, 1000, 1000);
        gaugeText.textAlign = 'center';
        return gaugeText;
    }

    return {
        Init: init,
        LoadMyServicePlans: loadMyServicePlans,
        SetFeaturedPlan: setFeaturedPlan
    };

})(jQuery);



let PaymentAccounts = (function ($) {

    let Urls;
    let Brand;
    let PaymentUIIFrameUrl;
    let AccessToken;
    let Url;
    let SelectedAccount;
    let PostObject;
    let SelectedAccountNumber;


    function resetUI() {
        $('#PaymentAccountsLoadingPanel').show();
        $('#PaymentAccountsPanel').hide();
        $('#PaymentAccountsErrorPanel').hide();
    }

    function loadPaymentAccounts(accountDetail) {

        resetUI();

        AccessToken = accountDetail.SelectedAccount.split('*')[1];
        SelectedAccount = accountDetail.SelectedAccountDetails;
        SelectedAccountNumber = accountDetail.SelectedAccount.split('*')[0].split("-")[0];
        Url = `${Urls.getPaymentToken}`;

        fetch(Url, {
            method: 'GET',
            headers: {
                "Content-Type": "application/json"
            },
        }).then((response) => {
            if (response.status === 200) {
                response.json().then(function (data) {
                    if (data) {

                        // build the request payload to post to iframe
                        let sessionId = data.SessionId;
                        PostObject = {
                            SessionId: sessionId,
                            CustomerNumber: SelectedAccount.Customer_Number,
                            CustomerAccountId: SelectedAccount.CustomerAccountId,
                            AccountStatus: SelectedAccount.AccountStatus,
                            ConnectStatus: SelectedAccount.ConnectStatus,
                            PastDue: SelectedAccount.PastDue,
                            CurrentBalance: SelectedAccount.CurrentBalance,
                            IsAutoPay: SelectedAccount.Auto_Pay,
                            LastInvoiceDueDate: SelectedAccount.LastInvoiceDueDate,
                            IsInsertPCILog: "1",
                            PastDueDisplayValue: SelectedAccount.PastDueDisplayValue,
                            CurrentBalaceDisplayValue: SelectedAccount.CurrentBalaceDisplayValue,
                            FirstName: $('#FirstNameHidden').val(),
                            LastName: $('#LastNameHidden').val(),
                            Email: SelectedAccount.Email,
                            ContactNumber: SelectedAccount.Cell
                        };

                        if (!PostObject.ContactNumber) {
                            ContactNumber: SelectedAccount.Phone;
                        }

                        // set the source to iframe.
                        document.getElementById('PaymentAccountsIFrame').src = `${PaymentUIIFrameUrl}/PaymentAccounts?Brand=${Brand}`;
                    }
                    else {

                    }
                });
            } else if (response.status === 400) {
                response.json().then(function (data) {
                }).catch((error) => { throw error });
            }
            else if (response.status === 500) {

            }
        }).catch((error) => {
        }).finally(() => {

        })
    }

    let init = function (urls, brand, paymentUIIFrameUrl) {

        Urls = urls;
        Brand = brand;
        PaymentUIIFrameUrl = paymentUIIFrameUrl;

        // post to iframe.
        const iframe = document.querySelector('#PaymentAccountsIFrame');
        iframe.onload = () => {
            // REVISIT
            //var makePaymentIframe = $('#MakePaymentIFrame')[0];
            //makePaymentIframe.contentWindow.postMessage(postObject, '*');
        }

        $('#PaymentAccountsIFrame').on('load', () => {
            // Here's how you'd do this with jQuery
        });


        function iframePostHandler(evt) {

            if (evt && evt.data) {

                var paymentAccountsIframe = $('#PaymentAccountsIFrame')[0];

                if (evt.data.Redirect === 'ViewMyBill') {
                    window.location.href = '/Payments/ViewMyBill';
                }

                if (evt.data.height) {
                    if (paymentAccountsIframe.contentWindow === evt.source) {
                        paymentAccountsIframe.height = evt.data.height + "px";
                        paymentAccountsIframe.style.height = evt.data.height + "px";
                    }
                }

                if (evt.data.Loaded) {
                    const timeValue = setInterval((interval) => {
                        if (PostObject) {
                            clearInterval(timeValue);
                            paymentAccountsIframe.contentWindow.postMessage(PostObject, '*');
                        }
                    }, 200);
                }

                if (evt.data.INSERTPCI) {

                    let request = {
                        ChildId: evt.data.ChildUniqueId,
                        PCISessionId: evt.data.PCISessionId,
                        Url: `${Urls.validatePCITransactionLog}`,
                        InsertPCITransactionUrl: `${Urls.insertPCITransaction}`,
                        AccessToken: AccessToken,
                        SelectedAccountNumber: SelectedAccountNumber
                    };

                    PaymentsHelper.ValidatePCITransaction(request, () => {
                        $('#PaymentAccountsLoadingPanel').hide();
                        $('#PaymentAccountsPanel').show();
                        $('#PaymentAccountsErrorPanel').hide();
                    }, () => {
                        $('#PaymentAccountsLoadingPanel').hide();
                        $('#PaymentAccountsPanel').hide();
                        $('#PaymentAccountsErrorPanel').show();
                    });
                }
            }
        }

        if (window.addEventListener) {
            window.addEventListener("message", iframePostHandler, false);
        }
        else {
            window.attachEvent("onmessage", iframePostHandler);
        }
    }

    return {
        Init: init,
        LoadPaymentAccounts: loadPaymentAccounts,
    };

})(jQuery);
let PaymentsHelper = (function ($) {

    function validatePCITransaction(request, cb, ecb) {

        fetch(request.Url, {
            method: 'POST',
            headers: {
                'RequestVerificationToken': $('input:hidden[name="__RequestVerificationToken"]').val(),
                "Content-Type": "application/json",
                "Access_Token": request.AccessToken
            },
            body: JSON.stringify(request)
        }).then((response) => {
            if (response.status === 200) {
                response.json().then(function (data) {
                    if (data.ResultCode == 1) {
                        cb();
                    } else {
                        if (ecb) {
                            var inesertPCIrequest = {
                                message: "Try Again CustNo: " + request.SelectedAccountNumber,
                                SourcePage: "Source Page: MyAccount - Payments,",
                                Url: `${request.InsertPCITransactionUrl}`,
                                AccessToken: request.AccessToken
                            };
                            insertPCILog(inesertPCIrequest);
                            ecb();
                        }
                    }
                });
            } else if (response.status === 400) {
                response.json().then(function (data) {
                }).catch((error) => { throw error });
            }
            else if (response.status === 500) {

            }
        }).catch((error) => {
        }).finally(() => {
        })
    }

    function insertPCILog(request) {

        let insertPCITransactionUrl = `${request.Url}`;
        fetch(insertPCITransactionUrl, {
            method: 'POST',
            headers: {
                'RequestVerificationToken': $('input:hidden[name="__RequestVerificationToken"]').val(),
                "Content-Type": "application/json",
                "Access_Token": request.AccessToken
            },
            body: JSON.stringify(request)
        }).then((response) => {
            if (response.status === 200) {
                response.json().then(function (data) {
                });
            } else if (response.status === 400) {
                response.json().then(function (data) {
                }).catch((error) => { throw error });
            }
            else if (response.status === 500) {
            }
        }).catch((error) => {
        }).finally(() => {
        })
    }

    function insertTransaction(request) {

        let insertTransactionUrl = `${request.Url}`;
        fetch(insertTransactionUrl, {
            method: 'POST',
            headers: {
                'RequestVerificationToken': $('input:hidden[name="__RequestVerificationToken"]').val(),
                "Content-Type": "application/json",
                "Access_Token": request.AccessToken
            },
            body: JSON.stringify(request)
        }).then((response) => {
            if (response.status === 200) {
                response.json().then(function (data) {
                });
            } else if (response.status === 400) {
                response.json().then(function (data) {
                }).catch((error) => { throw error });
            }
            else if (response.status === 500) {
            }
        }).catch((error) => {
        }).finally(() => {
        })
    }

    return {
        ValidatePCITransaction: validatePCITransaction,
        InsertPCILog: insertPCILog,
        InsertTransaction: insertTransaction
    };

})(jQuery);


let PaymentHistory_Invoices = (function ($) {

    let Urls;

    function resetUI() {
        $('#btnInvoices').removeClass().addClass('btn btn-primary');
        $('#btnPayments').removeClass().addClass('btn btn-outline-secondary');
    }

    function loadInvoices(accountDetail) {

        resetUI();

        let Access_Token = accountDetail.SelectedAccount.split('*')[1];
        let Url = `${Urls.getInvoices}`;
        let DownloadInvoiceUrl = `${Urls.downloadInvoice}`;

        fetch(Url, {
            method: 'GET',
            headers: {
                "Content-Type": "application/json",
                "Access_Token": Access_Token,
                "Is_Ajax_Request": true
            },
        }).then((response) => {
            if (response.status === 200) {
                response.json().then(function (invoices) {

                    $('#InvoicesPanelLoadingScreen').hide();
                    if (!invoices) {
                        $('#NoInvoicesPanel').show();
                        return;
                    }

                    $('#InvoicesPanel').show();

                    let ColumnHeaders = [
                        { title: 'Invoice Date', name: 'InvoiceDate', sort: 'desc', type: 'date' },
                        { title: 'Due Date', name: 'InvoiceDueDate', sort: '', type: 'date' },
                        { title: 'Total', name: 'TotalAmount', sort: '', type: 'dollar' },
                        { title: 'Paid Date', name: 'InvoicePaidDate', sort: '', type: 'date' }
                    ];

                    let Config = {
                        paging: true,
                        sorting: { columnHeaders: ColumnHeaders },
                    };

                    let rows = [];
                    let currentPage = 1;
                    let itemsPerPage = 10;
                    let totalItems = invoices.length;
                    let totalpages = Math.ceil(totalItems / itemsPerPage);

                    function buildColumnHeaders() {

                        let columnsLength = $('#invoicesHeader').find("th").length;
                        if (columnsLength > 3) {
                            $('#invoicesHeader').find("th").slice(0, columnsLength - 3).remove();
                        }

                        let invoicesheadertemplate = $('#invoicesHeaderTemplate').html();
                        $("#invoicesHeader").prepend(Mustache.to_html(invoicesheadertemplate, { RootTag: ColumnHeaders }));
                    }

                    function buildPagination() {

                        $('#invoicesPagination').empty();

                        $('#invoicesPagination').bootpag({
                            page: currentPage,
                            total: totalpages,
                            maxVisible: 5,
                            leaps: true,
                            next: "Next >>",
                            prev: "<< Prev"
                        }).on("page", function (event, pagenum) {
                            currentPage = pagenum;
                            onChangeTable(Config);
                        })
                    }

                    function sortByColumn(columnToSort) {

                        const sorting = Object.assign({}, Config.sorting).columnHeaders;
                        const sorted = sorting.map((columnHeader) => {
                            if (columnToSort.name === columnHeader.name) {
                                const newSort = columnHeader.sort === 'asc'
                                    ? 'desc'
                                    : 'asc';
                                return Object.assign(columnHeader, { sort: newSort });
                            } else {
                                return Object.assign(columnHeader, { sort: '' });
                            }
                        });

                        const newConfig = Object.assign({}, Config, {
                            sorting: { columns: sorted }
                        });

                        currentPage = 1;
                        buildPagination();
                        onChangeTable(newConfig);
                    }

                    function onChangeTable(config, pageNumber) {

                        if (config.sorting) {
                            Object.assign(Config.sorting, config.sorting);
                        }

                        const sortedData = changeSort(invoices, Config);
                        rows = paginate(sortedData, itemsPerPage, currentPage);

                        buildColumnHeaders();
                        let invoicestemplate = $('#invoicesTemplate').html();
                        $("#invoicestblBody").empty().html((Mustache.to_html(invoicestemplate, { RootTag: rows })));
                    }

                    function changeSort(data, config) {

                        if (!config.sorting) {
                            return data;
                        }

                        const columnHeaders = Config.sorting.columnHeaders || [];

                        // get the first column by default that has a sort value
                        const columnWithSort = columnHeaders.find((columnHeader) => {
                            /* Checking if sort prop exists and column needs to be sorted */
                            if (columnHeader.hasOwnProperty('sort') && columnHeader.sort !== '') {
                                return true;
                            }
                        });

                        return data.sort((previous, current) => {

                            if (columnWithSort.type === 'date') {
                                if (new Date(previous[columnWithSort.name] != null ? previous[columnWithSort.name] : new Date()) > new Date(current[columnWithSort.name] != null ? current[columnWithSort.name] : new Date())) {
                                    return columnWithSort.sort === 'desc'
                                        ? -1
                                        : 1;
                                } else if (new Date(previous[columnWithSort.name] != null ? previous[columnWithSort.name] : new Date()) < new Date(current[columnWithSort.name] != null ? current[columnWithSort.name] : new Date())) {
                                    return columnWithSort.sort === 'asc'
                                        ? -1
                                        : 1;
                                }

                            } else if (columnWithSort.type === 'dollar') {

                                if ((previous[columnWithSort.name]) > (current[columnWithSort.name])) {
                                    return columnWithSort.sort === 'desc'
                                        ? -1
                                        : 1;
                                } else if ((previous[columnWithSort.name]) < (current[columnWithSort.name])) {
                                    return columnWithSort.sort === 'asc'
                                        ? -1
                                        : 1;
                                }
                            }

                            return 0;

                        });
                    }

                    function paginate(array, page_size, page_number) {
                        --page_number; // because pages logically start with 1, but technically with 0
                        return array.slice(page_number * page_size, (page_number + 1) * page_size);
                    }

                    $(document).on("click", '[id ^= "InvoiceColumn-"]', function () {

                        let id = $(this).attr('id').split('InvoiceColumn-')[1];
                        let columnHeaderToSort = ColumnHeaders.find(x => x.name === id);
                        sortByColumn(columnHeaderToSort);
                    });

                    $(document).on("click", '[id ^= "ViewInvoiceDetailsBtn-"]', function () {

                        let id = $(this).attr('id').split('ViewInvoiceDetailsBtn-')[1];

                        let multiAccountPlaceholderElement = $('#ViewInvoiceDetailsModal-placeholder');
                        multiAccountPlaceholderElement.find('.modal').modal({
                            backdrop: 'static',
                            keyboard: false,
                            show: true
                        });

                    });

                    $(document).on("click", '[id ^= "DownloadInvoiceBtn-"]', function () {

                        let id = $(this).attr('id').split('DownloadInvoiceBtn-')[1];
                        let filepath = DownloadInvoiceUrl + "?accessToken=" + Access_Token + "&invoiceNumber=" + id;
                        var w = window.open(filepath, "__blank");
                        w.focus();
                        return false;

                    });

                    $(document).on("click", '[id ^= "PrintInvoiceBtn-"]', function () {
                        let id = $(this).attr('id').split('PrintInvoiceBtn-')[1];
                        let filepath = DownloadInvoiceUrl + "?accessToken=" + Access_Token + "&invoiceNumber=" + id;
                        print(filepath);
                    });

                    function print(url) {

                        let iframeId = 'iframeprint',
                            $iframe = $('iframe#iframeprint');
                        $iframe.attr('src', url);

                        $iframe.on("load", function () {
                            var PDF = document.getElementById(iframeId);
                            PDF.focus();
                            PDF.contentWindow.print();
                        });

                    }

                    $("#btnModalClose").click(() => $("#ViewInvoiceDetailsModal").modal("hide"));

                    onChangeTable(Config);
                    buildPagination();
                });

            } else if (response.status === 400) {
                response.json().then(function (data) {
                }).catch((error) => { throw error });
            }
            else if (response.status === 500) {

            }
        }).catch((error) => {
        }).finally(() => {

        })
    }

    let init = function (urls) {
        Urls = urls;
    }

    return {
        Init: init,
        LoadInvoices: loadInvoices,
    };

})(jQuery);


let PaymentHistory_Payments = (function ($) {

    let Urls;

    function resetUI() {
        $('#btnPayments').removeClass().addClass('btn btn-primary');
        $('#btnInvoices').removeClass().addClass('btn btn-outline-secondary');
    }

    function loadPayments(accountDetail) {

        resetUI();

        let Access_Token = accountDetail.SelectedAccount.split('*')[1];
        let Url = `${Urls.getPayments}`;

        fetch(Url, {
            method: 'GET',
            headers: {
                "Content-Type": "application/json",
                "Access_Token": Access_Token,
                "Is_Ajax_Request": true
            },
        }).then((response) => {
            if (response.status === 200) {
                response.json().then(function (payments) {

                    $('#PaymentsPanelLoadingScreen').hide();
                    if (!payments) {
                        $('#NoPaymentsPanel').show();
                        return;
                    }

                    $('#PaymentsPanel').show();

                    let ColumnHeaders = [
                        { title: 'Payment Date', name: 'Date', sort: 'desc', type: 'date' },
                        { title: 'Total', name: 'Amount', sort: '', type: 'dollar' },
                        { title: 'Type', name: 'Type', sort: '', type: 'dollar' },
                        { title: 'Auto Pay', name: 'IsAutoPay', sort: '', type: 'dollar' }
                    ];

                    let Config = {
                        paging: true,
                        sorting: { columnHeaders: ColumnHeaders },
                    };

                    let rows = [];
                    let currentPage = 1;
                    let itemsPerPage = 10;
                    let totalItems = payments.length;
                    let totalpages = Math.ceil(totalItems / itemsPerPage);

                    function buildColumnHeaders() {
                        let paymentsheadertemplate = $('#paymentsHeaderTemplate').html();
                        $("#paymentsHeader").empty().html(Mustache.to_html(paymentsheadertemplate, { RootTag: ColumnHeaders }));
                    }

                    function buildPagination() {

                        $('#paymentsPagination').empty();

                        $('#paymentsPagination').bootpag({
                            page: currentPage,
                            total: totalpages,
                            maxVisible: 5,
                            leaps: true,
                            next: "Next >>",
                            prev: "<< Prev"
                        }).on("page", function (event, pagenum) {
                            currentPage = pagenum;
                            onChangeTable(Config);
                        })
                    }

                    function sortByColumn(columnToSort) {

                        const sorting = Object.assign({}, Config.sorting).columnHeaders;
                        const sorted = sorting.map((columnHeader) => {
                            if (columnToSort.name === columnHeader.name) {
                                const newSort = columnHeader.sort === 'asc'
                                    ? 'desc'
                                    : 'asc';
                                return Object.assign(columnHeader, { sort: newSort });
                            } else {
                                return Object.assign(columnHeader, { sort: '' });
                            }
                        });

                        const newConfig = Object.assign({}, Config, {
                            sorting: { columns: sorted }
                        });

                        currentPage = 1;
                        buildPagination();
                        onChangeTable(newConfig);
                    }

                    function onChangeTable(config, pageNumber) {

                        if (config.sorting) {
                            Object.assign(Config.sorting, config.sorting);
                        }

                        const sortedData = changeSort(payments, Config);
                        rows = paginate(sortedData, itemsPerPage, currentPage);

                        buildColumnHeaders();
                        let paymentstemplate = $('#paymentsTemplate').html();
                        $("#paymentstblBody").empty().html((Mustache.to_html(paymentstemplate, { RootTag: rows })));
                    }

                    function changeSort(data, config) {

                        if (!config.sorting) {
                            return data;
                        }

                        const columnHeaders = Config.sorting.columnHeaders || [];

                        // get the first column by default that has a sort value
                        const columnWithSort = columnHeaders.find((columnHeader) => {
                            /* Checking if sort prop exists and column needs to be sorted */
                            if (columnHeader.hasOwnProperty('sort') && columnHeader.sort !== '') {
                                return true;
                            }
                        });

                        return data.sort((previous, current) => {

                            if (columnWithSort.type === 'date') {
                                if (new Date(previous[columnWithSort.name] != null ? previous[columnWithSort.name] : new Date()) > new Date(current[columnWithSort.name] != null ? current[columnWithSort.name] : new Date())) {
                                    return columnWithSort.sort === 'desc'
                                        ? -1
                                        : 1;
                                } else if (new Date(previous[columnWithSort.name] != null ? previous[columnWithSort.name] : new Date()) < new Date(current[columnWithSort.name] != null ? current[columnWithSort.name] : new Date())) {
                                    return columnWithSort.sort === 'asc'
                                        ? -1
                                        : 1;
                                }

                            } else if (columnWithSort.type === 'dollar') {

                                if ((previous[columnWithSort.name]) > (current[columnWithSort.name])) {
                                    return columnWithSort.sort === 'desc'
                                        ? -1
                                        : 1;
                                } else if ((previous[columnWithSort.name]) < (current[columnWithSort.name])) {
                                    return columnWithSort.sort === 'asc'
                                        ? -1
                                        : 1;
                                }
                            }

                            return 0;

                        });
                    }

                    function paginate(array, page_size, page_number) {
                        --page_number; // because pages logically start with 1, but technically with 0
                        return array.slice(page_number * page_size, (page_number + 1) * page_size);
                    }

                    $(document).on("click", '[id ^= "PaymentColumn-"]', function () {

                        let id = $(this).attr('id').split('PaymentColumn-')[1];
                        let columnHeaderToSort = ColumnHeaders.find(x => x.name === id);
                        sortByColumn(columnHeaderToSort);
                    });


                    onChangeTable(Config);
                    buildPagination();

                });

            } else if (response.status === 400) {
                response.json().then(function (data) {
                }).catch((error) => { throw error });
            }
            else if (response.status === 500) {

            }
        }).catch((error) => {
        }).finally(() => {

        })
    }

    let init = function (urls) {
        Urls = urls;
    }

    return {
        Init: init,
        LoadPayments: loadPayments,
    };

})(jQuery);

let PaymentOptions_AutoPay = (function ($) {

    let Urls;
    let PaymentUIIFrameUrl;
    let AccessToken;
    let Url;
    let SelectedAccount;
    let PostObject;
    let Brand;
    let SelectedAccountNumber;

    function resetUI() {
        $('#AutoPayBtn').addClass('payment-option-active');
        $('#BudgetBillingBtn').removeClass('payment-option-active');
        $('#PaymentExtensionBtn').removeClass('payment-option-active');

        $('#PaymentOptionsAutoPayLoadingPanel').show();
        $('#PaymentOptionsAutoPayPanel').hide();
        $('#PaymentOptionsAutoPayErrorPanel').hide();
    }

    function loadAutoPay(accountDetail) {

        resetUI();

        AccessToken = accountDetail.SelectedAccount.split('*')[1];
        SelectedAccount = accountDetail.SelectedAccountDetails;
        SelectedAccountNumber = accountDetail.SelectedAccount.split('*')[0].split("-")[0];
        Url = `${Urls.getPaymentToken}`;

        fetch(Url, {
            method: 'GET',
            headers: {
                "Content-Type": "application/json"
            },
        }).then((response) => {
            if (response.status === 200) {
                response.json().then(function (data) {
                    if (data) {

                        // build the request payload to post to iframe
                        let sessionId = data.SessionId;
                        PostObject = {
                            SessionId: sessionId,
                            CustomerNumber: SelectedAccount.Customer_Number,
                            CustomerAccountId: SelectedAccount.CustomerAccountId,
                            AccountStatus: SelectedAccount.AccountStatus,
                            ConnectStatus: SelectedAccount.ConnectStatus,
                            PastDue: SelectedAccount.PastDue,
                            CurrentBalance: SelectedAccount.CurrentBalance,
                            IsAutoPay: SelectedAccount.Auto_Pay,
                            LastInvoiceDueDate: SelectedAccount.LastInvoiceDueDate,
                            IsInsertPCILog: "1",
                            PastDueDisplayValue: SelectedAccount.PastDueDisplayValue,
                            CurrentBalaceDisplayValue: SelectedAccount.CurrentBalaceDisplayValue,
                            FirstName: $('#FirstNameHidden').val(),
                            LastName: $('#LastNameHidden').val(),
                            Email: SelectedAccount.Email,
                            ContactNumber: SelectedAccount.Cell
                        };

                        if (!PostObject.ContactNumber) {
                            ContactNumber: SelectedAccount.Phone;
                        }

                        // set the source to iframe.
                        document.getElementById('PaymentOptionsAutoPayIFrame').src = `${PaymentUIIFrameUrl}autobillpay?Brand=${Brand}`;
                    }
                    else {

                    }
                });
            } else if (response.status === 400) {
                response.json().then(function (data) {
                }).catch((error) => { throw error });
            }
            else if (response.status === 500) {

            }
        }).catch((error) => {
        }).finally(() => {

        })


    }

    let init = function (urls, brand, paymentUIIFrameUrl) {
        Urls = urls;
        Brand = brand;
        PaymentUIIFrameUrl = paymentUIIFrameUrl

        // post to iframe.
        const iframe = document.querySelector('#PaymentOptionsAutoPayIFrame');
        iframe.onload = () => {
            // REVISIT
            //var autoPayIframe = $('#PaymentOptionsAutoPayIFrame')[0];
            //autoPayIframe.contentWindow.postMessage(postObject, '*');
        }

        $('#PaymentOptionsAutoPayIFrame').on('load', () => {
            // Here's how you'd do this with jQuery
        });

        function iframePostHandler(evt) {

            if (evt && evt.data) {

                var autoPayIframe = $('#PaymentOptionsAutoPayIFrame')[0];

                if (evt.data.height) {
                    if (autoPayIframe.contentWindow === evt.source) {
                        autoPayIframe.height = evt.data.height + "px";
                        autoPayIframe.style.height = evt.data.height + "px";
                    }
                }

                if (evt.data.Loaded) {
                    const timeValue = setInterval((interval) => {
                        if (PostObject) {
                            clearInterval(timeValue);
                            autoPayIframe.contentWindow.postMessage(PostObject, '*');
                        }
                    }, 200);
                }

                if (evt.data.INSERTPCI) {

                    let request = {
                        ChildId: evt.data.ChildUniqueId,
                        PCISessionId: evt.data.PCISessionId,
                        Url: `${Urls.validatePCITransactionLog}`,
                        InsertPCITransactionUrl: `${Urls.insertPCITransaction}`,
                        AccessToken: AccessToken,
                        SelectedAccountNumber: SelectedAccountNumber
                    };

                    PaymentsHelper.ValidatePCITransaction(request, () => {
                        $('#PaymentOptionsAutoPayErrorPanel').hide();
                        $('#PaymentOptionsAutoPayLoadingPanel').hide();
                        $('#PaymentOptionsAutoPayPanel').show();
                    }, () => {
                        $('#PaymentOptionsAutoPayLoadingPanel').hide();
                        $('#PaymentOptionsAutoPayPanel').hide();
                        $('#PaymentOptionsAutoPayErrorPanel').show();
                    });
                }
            }
        }

        if (window.addEventListener) {
            window.addEventListener("message", iframePostHandler, false);
        }
        else {
            window.attachEvent("onmessage", iframePostHandler);
        }
    }

    return {
        Init: init,
        LoadAutoPay: loadAutoPay,
    };

})(jQuery);

let PaymentOptions_BudgetBilling = (function ($) {

    let Urls;
    let Brand;

    function resetUI() {
        $('#AutoPayBtn').removeClass('payment-option-active');
        $('#BudgetBillingBtn').addClass('payment-option-active');
        $('#PaymentExtensionBtn').removeClass('payment-option-active');
    }

    function loadBudgetBilling(accountDetail) {

        resetUI();

        let Access_Token = accountDetail.SelectedAccount.split('*')[1];
    }

    let init = function (urls, brand) {
        Brand = brand;
        Urls = urls;
    }

    return {
        Init: init,
        LoadBudgetBilling: loadBudgetBilling,
    };

})(jQuery);

let PaymentOptions_PaymentExtension = (function ($) {

    let Urls;
    let Brand

    function resetUI() {
        $('#AutoPayBtn').removeClass('payment-option-active');
        $('#BudgetBillingBtn').removeClass('payment-option-active');
        $('#PaymentExtensionBtn').addClass('payment-option-active');
    }

    function loadPaymentExtension(accountDetail) {

        resetUI();

        let Access_Token = accountDetail.SelectedAccount.split('*')[1];
    }

    let init = function (urls, brand) {
        Urls = urls;
        brand = brand;
    }

    return {
        Init: init,
        LoadPaymentExtension: loadPaymentExtension,
    };

})(jQuery);

let WeeklyUsage_EnergyInSights = (function ($) {

    let Urls;


    function resetUI() {

        $("#UsageTrackerDataPanel").hide();
        $("#UsageTrackerLoadingPanel").show();
        $("#NoUsageTrackerDataPanel").hide();
    }

    function drawTable(chart1, chart2) {
        var data1 = new google.visualization.DataTable();
        data1.addColumn("string", "UsageType");
        data1.addColumn("string", "Date");
        data1.addColumn("number", "Usage (kwh)");
        data1.addColumn("number", "Usage ($)");
        data1.addColumn("number", "Avg Temperature");
        var arr1 = getChart1(chart1);
        data1.addRows(arr1);
        var view1 = new google.visualization.DataView(data1);
        view1.setColumns([1
            , { calc: getLastInvoice, type: "number" }
            , { calc: getNextInvoice, type: "number" }
            , { calc: getUsageCertain, role: "certainty", type: "boolean" }
            , { calc: getUsageScope, role: "scope", type: "boolean" }
            , 4
            , { calc: getTempCertain, role: "certainty", type: "boolean" }
        ]);
        var chartOptions = {
            title: "Daily Usage",
            hAxis: { title: "Dates" },
            height: 330,
            width: 820,
            vAxes: {
                0: { title: "Daily Usage (KWH)", textStyle: { color: "black" }, titleTextStyle: { color: "black" } }
                , 1: { title: "Avg Temperature F", textStyle: { color: "red" }, titleTextStyle: { color: "red" } }
            }
            , seriesType: "bars"
            , series: {
                0: { type: "bars", targetAxisIndex: 0, labelInLegend: "Last Invoice", color: "#EA7516" }
                , 1: { type: "bars", targetAxisIndex: 0, labelInLegend: "Next Invoice", color: "#F19713" }
                , 2: { type: "line", targetAxisIndex: 1, pointShape: "circle", color: "#ff5151" }
            },
            pointSize: 7
        };
        var chart1 = new google.visualization.ComboChart(document.getElementById("chart1_div"));
        chart1.draw(view1, chartOptions);


        //Chart-2

        var data2 = new google.visualization.DataTable();
        data2.addColumn("string", "DOW");
        data2.addColumn("number", "PrevUsage");
        data2.addColumn("number", "PrevTemp");
        data2.addColumn("number", "CurrentUsage");
        data2.addColumn("number", "CurrentTemp");
        var arr2 = getChart2(chart2);
        data2.addRows(arr2);
        var chartOptions2 = {
            chart: { title: "Weekly Usage Summary" }
            , legend: { textStyle: { fontSize: 12 } }
            , seriesType: "bars"
            , hAxis: { title: "Day of week" }
            , height: 200
            , width: 820
            , vAxes: {
                0: { title: "Daily Usage (KWH)", textStyle: { color: "black" }, titleTextStyle: { color: "black" } }
                , 1: { title: "Avg Temperature F", textStyle: { color: "black" }, titleTextStyle: { color: "black" } }
            }
            , series: {

                0: { type: "bars", targetAxisIndex: 0, labelInLegend: "Last Week Usage", color: "#EA7516" }
                , 1: { type: "line", targetAxisIndex: 1, pointShape: "circle", color: "#EA7516", labelInLegend: "Last Week Temp" }
                , 2: { type: "bars", targetAxisIndex: 0, labelInLegend: "Current Week Usage", color: "#F19713" }
                , 3: { type: "line", targetAxisIndex: 1, pointShape: "circle", color: "#F19713", labelInLegend: "Current Week Temp" }

            }
            , pointSize: 7
        };
        var chart2 = new google.visualization.ComboChart(document.getElementById("chart2_div"));
        chart2.draw(data2, chartOptions2);
    }

    function getChart1(str_Chart1) {
        var arr = [];
        if (str_Chart1 != null && str_Chart1 != '') {
            var rows = str_Chart1.split(";");
            for (var i = 0; i < rows.length; i++) {
                var row = rows[i].split(",");
                arr.push([row[0], row[1], parseInt(row[2]), parseFloat(row[3]), parseFloat(row[4])]);
            }
        }
        return arr;
    }

    function getChart2(str_Chart2) {
        var arr = [];
        if (str_Chart2 != null && str_Chart2 != '') {
            var rows = str_Chart2.split(";");
            for (var i = 0; i < rows.length; i++) {
                var row = rows[i].split(",");
                arr.push([row[0], parseInt(row[1]), parseFloat(row[2]), parseInt(row[3]), parseFloat(row[4])]);
            }
        }
        return arr;
    }

    function getLastInvoice(vw, row) {
        var f = null;
        var g = vw.getValue(row, 0).trim();
        if (g.charAt(0) == "L") {
            f = vw.getValue(row, 2);;
        }
        return f;
    }

    function getNextInvoice(vw, row) {
        var f = null;
        var g = vw.getValue(row, 0).trim();
        if (g.charAt(0) == "N") {
            f = vw.getValue(row, 2);
        }
        return f;
    }

    function getUsageCertain(vw, row) {
        var f = false;
        var g = vw.getValue(row, 0).trim();
        if (g.charAt(1) == "A") {
            f = true;
        }
        return f;
    }

    function getTempCertain(vw, row) {
        var f = false;
        var g = vw.getValue(row, 0).trim();
        if (g.charAt(1) == "A") {
            f = true;
        }
        return f;
    }

    function getUsageScope(vw, row) {
        var f = true;
        var g = vw.getValue(row, 0)
        if (g.charAt(1) == "N") { f = false; }
        return f;
    }


    function loadWeeklyUsageDetails(accountDetail) {

        resetUI();

        let Access_Token = accountDetail.SelectedAccount.split('*')[1];
        let CustomerAccountId = accountDetail.SelectedAccount.split('-')[1].split("*")[0];

        let Url = `${Urls.getWeeklyUsageDetails}?CustomerAccountId=${CustomerAccountId}`;

        fetch(Url, {
            method: 'GET',
            headers: {
                "Content-Type": "application/json",
                "Access_Token": Access_Token,
                "Is_Ajax_Request": true
            },
        }).then((response) => {
            if (response.status === 200) {
                response.json().then(function (result) {


                    $("#UsageTrackerLoadingPanel").hide();
                    $("#UsageTrackerDataPanel").show();
                    
                    //First View
                    $("#lblThisWeekKWH").text(result.ThisWeekKWH);
                    $("#lblThisWeekAmt").text(result.ThisWeekAmt);
                    $("#lblWeeklyAmountDiff").text(result.WeeklyAmtDiff);
                    $("#lblLastWeekAmt").text(result.LastWeekAmt);
                    $("#lblLastWeekFrom").text(result.LastWeekFrom);
                    $("#lblLastWeekTo").text(result.LastWeekTo);
                    $("#lblThisWeekFrom").text(result.ThisWeekFrom);
                    $("#lblThisWeekTo").text(result.ThisWeekTo);
                    $("#lblLastWeekKWH").text(result.LastWeekKWH);
                    $("#lblThisWeekKWH1").text(result.ThisWeekKWH);
                    $("#lblWeeklyKWHDiff").text(result.WeeklyKWHDiff);
                    $("#lblLastWeekAmt1").text(result.LastWeekAmt);
                    $("#lblThisWeekAmt1").text(result.ThisWeekAmt);
                    $("#lblWeeklyAmtDiff").text(result.WeeklyAmtDiff);
                    $("#lblLastWeekDailyKWH").text(result.LastWeekDailyKWH);
                    $("#lblThisWeekDailyKWH").text(result.ThisWeekDailyKWH);
                    $("#lblWeeklyDailyUsageDiff").text(result.WeeklyDailyUsageDiff);
                    $("#lblCustName").text(result.CustName);
                    if (result.ThisWeekAmt < result.LastWeekAmt) {
                        $("#lblLessorGtr").text('less');
                    }
                    else if (result.ThisWeekAmt > result.LastWeekAmt) {
                        $("#lblLessorGtr").text('greater');
                    }
                    else {
                        $("#lblLessorGtr").text('equal');
                    }
                    $("#lblLastInvoiceFrom").text(result.LastInvoiceFrom);
                    $("#lblLastInvoiceTo").text(result.LastInvoiceTo);
                    $("#lblLastInvoiceAmt").text(result.LastInvoiceAmt);
                    $("#lblNextInvoiceFrom").text(result.NextInvoiceFrom);
                    $("#lblNextInvoiceTo").text(result.NextInvoiceTo);
                    $("#lblProjectedInvoiceAmt").text(result.ProjectedInvoiceAmt);
                    $("#lblServiceAddress").text(result.ServiceAddress);

                    //for second View
                    $("#circlelblThisWeekKWH").text(result.ThisWeekKWH);
                    $("#circlelblThisWeekAmt").text(result.ThisWeekAmt);
                    $("#circlelblWeeklyAmountDiff").text(result.WeeklyAmtDiff);
                    $("#circlelblLastWeekAmt").text(result.LastWeekAmt);
                    $("#circlelblLastWeekFrom").text(result.LastWeekFrom);
                    $("#circlelblLastWeekTo").text(result.LastWeekTo);
                    $("#circlelblThisWeekFrom").text(result.ThisWeekFrom);
                    $("#circlelblThisWeekTo").text(result.ThisWeekTo);
                    $("#circlelblLastWeekKWH").text(result.LastWeekKWH);
                    $("#circlelblThisWeekKWH1").text(result.ThisWeekKWH);
                    $("#circlelblWeeklyKWHDiff").text(result.WeeklyKWHDiff);
                    $("#circlelblLastWeekAmt1").text(result.LastWeekAmt);
                    $("#circlelblThisWeekAmt1").text(result.ThisWeekAmt);
                    $("#circlelblWeeklyAmtDiff").text(result.WeeklyAmtDiff);
                    $("#circlelblLastWeekDailyKWH").text(result.LastWeekDailyKWH);
                    $("#circlelblThisWeekDailyKWH").text(result.ThisWeekDailyKWH);
                    $("#circlelblWeeklyDailyUsageDiff").text(result.WeeklyDailyUsageDiff);
                    $("#circlelblCustName").text(result.CustName);
                    if (result.ThisWeekAmt < result.LastWeekAmt) {
                        $("#circlelblLessorGtr").text('less');
                    }
                    else if (result.ThisWeekAmt > result.LastWeekAmt) {
                        $("#circlelblLessorGtr").text('greater');
                    }
                    else {
                        $("#circlelblLessorGtr").text('equal');
                    }
                    $("#circlelblLastInvoiceFrom").text(result.LastInvoiceFrom);
                    $("#circlelblLastInvoiceTo").text(result.LastInvoiceTo);
                    $("#circlelblLastInvoiceAmt").text(result.LastInvoiceAmt);
                    $("#circlelblNextInvoiceFrom").text(result.NextInvoiceFrom);
                    $("#circlelblNextInvoiceTo").text(result.NextInvoiceTo);
                    $("#circlelblProjectedInvoiceAmt").text(result.ProjectedInvoiceAmt);
                    $("#circlelblServiceAddress").text(result.ServiceAddress);

                    drawTable(result.Chart1, result.Chart2);

                });

            } else if (response.status === 400) {
                response.json().then(function (data) {
                }).catch((error) => { throw error });
            }
            else if (response.status === 500) {

                $("#UsageTrackerDataPanel").hide();
                $("#UsageTrackerLoadingPanel").hide();
                $("#NoUsageTrackerDataPanel").show();

            }
        }).catch((error) => {
        }).finally(() => {



        })
    }

    let init = function (urls) {
        Urls = urls;
    }

    return {
        Init: init,
        LoadWeeklyUsageDetails: loadWeeklyUsageDetails,
    };

})(jQuery);

let ReferAFriend_ReferralOptions = (function ($) {

    let Urls;
    let ReferralLink;
    let Access_Token;

    function IDGenerator() {

        this.length = 8;
        this.timestamp = +new Date;

        let _getRandomInt = function (min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }

        this.generate = function () {
            let ts = this.timestamp.toString();
            let parts = ts.split("").reverse();
            let id = "";

            for (var i = 0; i < this.length; ++i) {
                var index = _getRandomInt(0, parts.length - 1);
                id += parts[index];
            }

            return id;
        }
    }

    function resetUI() {

        $('#btnReferralOptions').removeClass().addClass('btn btn-myAccountPrimary');
        $('#btnMyRewards').removeClass().addClass('btn btn-outline-secondary');
        $('#btnRewardPreferences').removeClass().addClass('btn btn-outline-secondary');
    }

    function loadReferralOptions(accountDetail) {

        resetUI();
        Access_Token = accountDetail.SelectedAccount.split('*')[1];
        $('#AccountNumberDisplay').html();

        let referralLink = ReferralLink.replace('CustomerNumber', accountDetail.SelectedAccount.split('*')[0].split('-')[0]);
        $('#ReferralLinkText').val(referralLink);
    }

    function ValidateMessageCenterForm(id, btnSubmitIds) {

        let formtoValidate = $(`#${id}`);
        if (formtoValidate && formtoValidate.length > 0) {

            var valid = formtoValidate.validate().checkForm();

            if (Array.isArray(btnSubmitIds)) {
                for (var i = 0; i < btnSubmitIds.length; i++) {
                    btnSubmitIds[i] = `#${btnSubmitIds[i]}`;
                }
                btnSubmitIds = btnSubmitIds.join();
            } else {
                btnSubmitIds = `#${btnSubmitIds}`;
            }

            if (valid) {
                $(btnSubmitIds).removeClass('disabled');
            } else {
                $(btnSubmitIds).addClass('disabled');
            }
        }
    }

    function triggerNewValidation(paymentAccountPanelId) {
        $(`#${paymentAccountPanelId} input[type='email']`).valid();
    }

    let init = function (urls, referral_link) {

        Urls = urls;
        ReferralLink = referral_link;

        $('#SelectReferralLinkBtn').click(() => {
            const input = document.getElementById('ReferralLinkText');
            input.focus();
            input.select();
        });

        $('#addNewFriendBtn').click(() => {

            let count = $('[id^="AddNewReferAFriendPanel-"]').length;
            if (count === 4) {
                return;
            }

            let template = $('#referAFriendTemplate').html();
            let generator = new IDGenerator();

            let inputRow = {};
            let uniqueid = generator.generate();
            inputRow.Id = uniqueid;

            var html = Mustache.to_html(template, inputRow);
            $('#ReferFriendsList').append(html);

            // select auto bill pay from the list of paymethods selected.
            $(document).on("click", `[id^="RemoveReferAFriendBtn-${uniqueid}"]`, function () {
                let id = $(this).attr('id').split('RemoveReferAFriendBtn-')[1];
                $(`#AddNewReferAFriendPanel-${id}`).remove();

                triggerNewValidation('ReferFriendsList');
                ValidateMessageCenterForm(`ReferAFriendForm`, `ReferFriendsSubmitBtn`);
            });

            $('.referAFriendEmail').each(function () {
                $(this).rules("add", {
                    required: true,
                    email: true
                });
            });

            triggerNewValidation('ReferFriendsList');
            ValidateMessageCenterForm(`ReferAFriendForm`, `ReferFriendsSubmitBtn`);
        });

        $("form[id='ReferAFriendForm']").validate({
            rules: {
                InitialReferAFriendEmail: {
                    required: true,
                    email: true
                }
            },
            messages: {
                InitialReferAFriendEmail:
                {
                    required: "Email is required.",
                    email: "Email is invalid."
                }
            },
            highlight: function (element) {
                $(element).addClass('is-invalid');
            },
            unhighlight: function (element) {
                $(element).removeClass('is-invalid')
            },
            errorPlacement: function (error, element) {
                $(element).next().append(error);
            },
            submitHandler: function (form, event) {
                event.preventDefault();

                let fullName = $('#FullNameHidden').val();
                let toList = '';
                $('.referAFriendEmail').each(function () {
                    toList = toList + $(this).val() + ';';
                });

                var request = {
                    To: toList,
                    Type: 'ReferAFriend',
                    Subject: 'Switch and Lower Your Energy Bill in 5 Minutes!',
                    CustomerName: fullName,
                };

                console.log(toList);

                let Url = `${Urls.referAFriend}`;
                fetch(Url, {
                    method: 'POST',
                    headers: {
                        'RequestVerificationToken': $('input:hidden[name="__RequestVerificationToken"]').val(),
                        "Content-Type": "application/json",
                        "Access_Token": Access_Token,
                        "Is_Ajax_Request": true
                    },
                    body: JSON.stringify(request)
                }).then((response) => {
                    if (response.status === 200) {
                        response.json().then(function (data) {
                            if (data.ResultCode === 1) {
                                $('#ReferralEmailSuccessPanel').show();
                                $(`#ReferFriendsList :text`).val('');
                                $(`#ReferFriendsList input[type='email']`).val('');
                                ValidateMessageCenterForm(`ReferAFriendForm`, `ReferFriendsSubmitBtn`);
                            }
                        }).catch((error) => { throw error });

                    } else if (response.status === 404) {
                        response.json().then(function (data) {

                        });
                    }
                    else if (response.status === 500) {

                    }
                }).catch((err) => {

                }).finally(() => {

                })
            }
        });

        $(`#ReferAFriendForm`).on('blur keyup change', 'input', function (event) {
            ValidateMessageCenterForm(`ReferAFriendForm`, `ReferFriendsSubmitBtn`);
        });

        ValidateMessageCenterForm(`ReferAFriendForm`, `ReferFriendsSubmitBtn`);
    }

    return {
        Init: init,
        LoadReferralOptions: loadReferralOptions,
    };

})(jQuery);

let ReferAFriend_MyRewards = (function ($) {

    let Urls;

    function resetUI() {

        $('#btnReferralOptions').removeClass().addClass('btn btn-outline-secondary');
        $('#btnMyRewards').removeClass().addClass('btn btn-myAccountPrimary');
        $('#btnRewardPreferences').removeClass().addClass('btn btn-outline-secondary');
    }

    function loadMyRewards(accountDetail) {

        resetUI();

    }

    let init = function (urls) {
        Urls = urls;
    }

    return {
        Init: init,
        LoadMyRewards: loadMyRewards,
    };

})(jQuery);

let ReferAFriend_RewardPreferences = (function ($) {

    let Urls;

    function resetUI() {


        $('#btnReferralOptions').removeClass().addClass('btn btn-outline-secondary');
        $('#btnMyRewards').removeClass().addClass('btn btn-outline-secondary');
        $('#btnRewardPreferences').removeClass().addClass('btn btn-myAccountPrimary');
    }

    function loadRewardPreferences(accountDetail) {

        resetUI();
    }

    let init = function (urls) {
        Urls = urls;
    }

    return {
        Init: init,
        LoadRewardPreferences: loadRewardPreferences,
    };

})(jQuery);






let Registration = (function ($) {

    let Brand;

    function assingEventHandlers() {
        $("#btnModalClose").click(() => $("#registrationModal").modal("hide"));
        $("#btnUserLogin").click(() => $("#registrationModal").modal("hide"));
    }

    function initializeRegistraionForm() {

        let verifyResponse = {};

        $("form[id='userRegistrationForm']").validate({
            rules: {
                UserPassword: {
                    minlength: 4,
                    maxlength: 8
                },
                ConfirmPassword: {
                    minlength: 4,
                    maxlength: 8,
                    equalTo: '[name="UserPassword"]'
                }
            },
            messages: {
                UserPassword: {
                    minlength: "Password should be a minimum of 4 characters"
                },
                ConfirmPassword: {
                    minlength: "Password should be a minimum of 4 characters",
                    equalTo: "Passwords should match"
                }
            },
            highlight: function (element) {
                $(element).addClass('is-invalid');
            },
            unhighlight: function (element) {
                $(element).removeClass('is-invalid')
            },
            errorPlacement: function (error, element) {
                $(element).next().append(error);
            },
            submitHandler: function (form) {
                $('#userRegistrationError').hide();

                let request = {
                    'Email': verifyResponse.Email,
                    'AccountNumber': verifyResponse.AccountNumber,
                    'Password': $("input[name='UserPassword']").val(),
                    'AccessToken': verifyResponse.AccessToken,
                    'State': verifyResponse.State
                };

                $('#userRegistrationBtnProcessing').show();
                $('#userRegistrationBtn').hide();

                fetch('Account/RegisterUser', {
                    method: 'POST',
                    headers: {
                        'RequestVerificationToken': $('input:hidden[name="__RequestVerificationToken"]').val(),
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(request)
                }).then((response) => {
                    if (response.status === 200) {
                        response.json().then(function (data) {
                            $('#btnRegisterToolbar').hide();
                            $('#userRegistrationSuccess').show();
                            $('#btnUserLogin').show();
                        }).catch((error) => { throw error });

                    } else if (response.status === 404) {
                        response.json().then(function (data) {
                            $('#userRegistrationError').show();
                            $('#userRegistrationError').find("b").html(data.Message);
                        });
                    }
                    else if (response.status === 500) {
                        $('#userRegistrationError').show();
                        $('#userRegistrationError').find("b").html("Could not complete user registration!! Please try again!!");
                    }
                }).catch((err) => {
                    $('#userRegistrationError').show();
                    $('#userRegistrationError').find("b").html("Could not complete user registration!! Please try again!!");
                }).finally(() => {
                    $('#userRegistrationBtn').show();
                    $('#userRegistrationBtnProcessing').hide();
                })
            }
        });

        $("form[id='validateRegistrationForm']").validate({
            rules: {
                Email: {
                    email: true,
                    required: true
                },
                AccountNumber: {
                    required: true,
                    minlength: 4,
                    maxlength: 8
                },
                PhoneNumber: {
                    required: true,
                    minlength: 10,
                    maxlength: 10,
                    number: true
                },
                Last4SSN: {
                    number: true,
                    minlength: 4,
                    maxlength: 4
                },
                StreetNumber: {
                    minlength: 4,
                    maxlength: 20
                }
            },
            messages: {
                Email: {
                    email: "Please enter a valid Email",
                    required: "Please enter your Email"
                },
                AccountNumber: {
                    required: "Please enter you Account Number",
                    minlength: "Account Number should be at least 3 characters"
                },
                PhoneNumber: {
                    required: "Please enter your Phone Number.",
                    minlength: "Phone Number should be 10 digits",
                    number: "Phone Number should be 10 digits"
                },
                Last4SSN: {
                    minlength: "Should be 4 digits",
                    number: "Last 4 of SSN should be a number"
                },
                StreetNumber: {
                    minlength: "Street Number should be atleast 4 characters"
                }
            },
            highlight: function (element) {
                $(element).addClass('is-invalid');
            },
            unhighlight: function (element) {
                $(element).removeClass('is-invalid')
            },
            errorPlacement: function (error, element) {
                $(element).next().append(error);
            },
            submitHandler: function (form) {
                $('#verifyUserRegistrationError').hide();
                let request = {
                    'EmailAddress': $("input[name='Email']").val(),
                    'AccountNumber': $("input[name='AccountNumber']").val(),
                    'PhoneNumber': $("input[name='PhoneNumber']").val()
                };
                request.Last4SSN = $("input[name='Last4SSN']").val() || null;
                request.StreetNumber = $("input[name='StreetNumber']").val() || null;

                $('#verifyUserRegistrationBtnProcessing').show();
                $('#verifyUserRegistrationBtn').hide();

                fetch('Account/VerifyUserRegistration', {
                    method: 'POST',
                    headers: {
                        'RequestVerificationToken': $('input:hidden[name="__RequestVerificationToken"]').val(),
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(request)
                }).then((response) => {
                    if (response.status === 200) {
                        response.json().then(function (data) {

                            verifyResponse.Email = data.Email;
                            verifyResponse.AccountNumber = data.AccountNumber;
                            verifyResponse.AccessToken = data.AccessToken;
                            verifyResponse.Name = data.Name;
                            verifyResponse.State = data.State;

                            $('#userNameLabel').find("b").html(verifyResponse.Name);
                            $('#verfiyUserRegistrationPanel').hide();
                            $('#registrationPanel').show();
                        });
                    } else if (response.status === 404) {
                        response.json().then(function (data) {
                            $('#verifyUserRegistrationError').show();
                            $('#verifyUserRegistrationError').find("b").html(data.Message);
                        }).catch((error) => { throw error });;
                    }
                    else if (response.status === 500) {
                        $('#verifyUserRegistrationError').show();
                        $('#verifyUserRegistrationError').find("b").html("Error in verifying the user registration!! Please try again!!");
                    }
                }).catch((error) => {
                    $('#verifyUserRegistrationError').show();
                    $('#verifyUserRegistrationError').find("b").html("Error in verifying the user registration!! Please try again!!");
                }).finally(() => {
                    $('#verifyUserRegistrationBtnProcessing').hide();
                    $('#verifyUserRegistrationBtn').show();
                })
            }
        });
    }

    let init = function (brand) {

        Brand = brand;

        if (Brand.toLowerCase() === 'frontier') {
            $('#BrandTitle').html('for Frontier');
        } else if (Brand.toLowerCase() === 'gexa') {
            $('#BrandTitle').html('for Gexa');
        }

        assingEventHandlers();
        initializeRegistraionForm();
    }

    return {
        Init: init
    };

})(jQuery);

let RenewalPlans = (function ($) {

    let Urls;
    let RenewalPlans;
    let Access_Token;
    let Url;
    let SelectedAccountDetails;

    let init = function (urls) {

        Urls = urls;

        $('#ViewMorePlansSelectPanel').find("i").click(function () {
            $(this).toggleClass('fa-chevron-up fa-chevron-down');
            $('#RenewMorePlansPanel').toggle('slow', function () {
            });
        });

        // modals
        $('#btnPlanConfirmationModalClose').click(function () {
            $('#planconfirmationModal').modal('hide');
        });

        $('#btnErrorModalClose').click(function () {
            $('#errorModal').modal('hide');
        });

        $('#errorModal,#planconfirmationModal').on('hidden.bs.modal', function (e) {
            $('#ParentRenewalPanel *').prop('disabled', false);
            $('[id ^= "btnSubmitRenewal-"]').show();
            $('[id ^= "btnSubmitRenewalProcessing-"]').hide();
        });
    }

    function loadRenewalPlans(accountDetail) {
        Access_Token = accountDetail.SelectedAccount.split('*')[1];
        Url = `${Urls.getRenewalPlans}?Customer_Account_Id=${accountDetail.SelectedAccountDetails.CustomerAccountId}`;
        SelectedAccountDetails = accountDetail.SelectedAccountDetails;
        if (accountDetail.SelectedAccountDetails.ReNew) {
            load();
        } else {
            $('#RenewalPlansPanel').show();
            $('#RenewalPlansLoadingPanel').hide();
            $('#NoRenewalPlansPanel').show();
        }
    }

    function resetUI() {
        $('#RenewalPlansPanel').hide();
        $('#RenewalPlansLoadingPanel').show();
    }

    function load() {

        resetUI();

        fetch(Url, {
            method: 'GET',
            headers: {
                "Content-Type": "application/json",
                "Access_Token": Access_Token,
                "Is_Ajax_Request": true
            },
        }).then((response) => {
            if (response.status === 200) {
                response.json().then(function (renewalPlans) {


                    $('#RenewalPlansLoadingPanel').hide();

                    if (!renewalPlans || renewalPlans.length === 0) {
                        $('#NoRenewalPlansPanel').show();
                        return;
                    }

                    $('#RenewalPlansPanel').show();
                    $('#Top3RenewPlansPanel').show();
                    $('#NoRenewalPlansPanel').hide();

                    console.log(renewalPlans[0]);
                    renewalPlans.forEach(function (x) {
                        x.ContractTermCode = x.ContractTermCode.split('MTH')[0];
                    });

                    RenewalPlans = renewalPlans;
                    NyServicePlans.SetFeaturedPlan(renewalPlans[0]);

                    let top3RenewPlans = RenewalPlans.slice(0, 3);
                    let renewPlanCardTemplate = $('#renewPlanCardTemplate').html();
                    $('#Top3RenewPlansPanel').empty().html(Mustache.to_html(renewPlanCardTemplate, { RootTag: top3RenewPlans }));

                    if (renewalPlans.length > 3) {
                        $('#ViewMorePlansSelectPanel').show();

                        let nextRenewPlans = RenewalPlans.slice(3, RenewalPlans.length);
                        let renewPlanCardTemplate = $('#renewPlanCardTemplate').html();
                        $('#RenewMorePlansPanel').empty().html(Mustache.to_html(renewPlanCardTemplate, { RootTag: nextRenewPlans }));
                    }

                    $(document).off('click', '[id ^= "WhatsInPlanFlip-"]').on('click', '[id ^= "WhatsInPlanFlip-"]', function () {
                        var id = $(this).attr('id').split('WhatsInPlanFlip-')[1];
                        $(`#plan_${id}`).toggleClass('applyflip');
                    });

                    $(document).off('click', '[id ^= "RevertPlanFlip-"]').on('click', '[id ^= "RevertPlanFlip-"]', function () {
                        var id = $(this).attr('id').split('RevertPlanFlip-')[1];
                        $(`#plan_${id}`).toggleClass('applyflip');
                    });

                    $(document).off('click', '[id ^= "SelectPlanFlip-"]').on('click', '[id ^= "SelectPlanFlip-"]', function () {
                        var id = $(this).attr('id').split('SelectPlanFlip-')[1];
                        $(`#plan_${id}`).toggleClass('applyflip');
                        $('#planSelect_confirm_' + id).toggleClass('reveal');
                    });

                    $(document).off('click', '[id ^= "SelectPlan-"]').on('click', '[id ^= "SelectPlan-"]', function () {
                        var id = $(this).attr('id').split('SelectPlan-')[1];
                        $('#planSelect_confirm_' + id).toggleClass('reveal');
                    });

                    $(document).off('click', '[id ^= "OfferAgreedCheck-"]').on('click', '[id ^= "OfferAgreedCheck-"]', function () {
                        let id = $(this).attr('id').split('OfferAgreedCheck-')[1];
                        if ($(this).prop('checked')) {
                            $(`#btnSubmitRenewal-${id}`).prop('disabled', false);
                        } else {
                            $(`#btnSubmitRenewal-${id}`).prop('disabled', true);
                        }
                    });

                    $(document).off('click', '[id ^= "btnSubmitRenewal-"]').on('click', '[id ^= "btnSubmitRenewal-"]', function () {
                        var id = $(this).attr('id').split('btnSubmitRenewal-')[1];
                        $(this).hide();
                        $(`#btnSubmitRenewalProcessing-${id}`).show();
                        //$(`#btnCancelRenewal-${id}`).prop('disabled', true);
                        // 

                        let selectedRenewPlan = RenewalPlans.find(x => x.Id === id);

                        let request = {
                            CustomerAccountId: SelectedAccountDetails.CustomerAccountId,
                            PricePlanCode: selectedRenewPlan.PricePlanCode,
                            TcoCode: selectedRenewPlan.TCOCode,
                            RenewRate: selectedRenewPlan.UnitRate,
                            ProductCode: selectedRenewPlan.ProductCode,
                            ContractTermCode: selectedRenewPlan.ContractTermCode,
                            ProductTitle: selectedRenewPlan.ProductTitle,
                            CustomerName: SelectedAccountDetails.CustomerName,
                            Email: SelectedAccountDetails.Email,
                            PostalAddress: {
                                Line_1: SelectedAccountDetails.PostalAddress1,
                                City: SelectedAccountDetails.PostalAddressCity,
                                State: SelectedAccountDetails.PostalAddressState,
                                Zip: SelectedAccountDetails.PostalPostCode
                            },
                            EflRate: selectedRenewPlan.EFLRate,
                            EtfCharge: selectedRenewPlan.ETFCharge,
                            TdspCode: selectedRenewPlan.TDSPCode,
                            CustomerNumber: SelectedAccountDetails.Customer_Number,
                            Phone: SelectedAccountDetails.Phone
                        };

                        fetch(Urls.renew, {
                            method: 'POST',
                            headers: {
                                'RequestVerificationToken': $('input:hidden[name="__RequestVerificationToken"]').val(),
                                "Content-Type": "application/json",
                                "Access_Token": Access_Token
                            },
                            body: JSON.stringify(request)
                        }).then((response) => {
                            if (response.status === 200) {
                                response.json().then(function (data) {

                                    if (data.ResultCode === 1) {
                                        let planConfirmationPlaceholderElement = $('#PlanConfirmationModal-placeholder');
                                        planConfirmationPlaceholderElement.find('.modal').modal({
                                            backdrop: 'static',
                                            keyboard: false,
                                            show: true
                                        });

                                        AccountSelector.Reload();

                                    } else {
                                        let errorModalPlaceholderElement = $('#ErrorModal-placeholder');
                                        errorModalPlaceholderElement.find('.modal').modal({
                                            backdrop: 'static',
                                            keyboard: false,
                                            show: true
                                        });
                                    }
                                });
                            } else if (response.status === 400) {
                                response.json().then(function (data) {
                                }).catch((error) => { throw error });
                            }
                            else if (response.status === 500) {
                            }
                        }).catch((error) => {
                        }).finally(() => {
                        })

                        $('#ParentRenewalPanel *').prop('disabled', true);

                    });

                    $(document).off('click', '[id ^= "btnCancelRenewal-"]').on('click', '[id ^= "btnCancelRenewal-"]', function () {
                        var id = $(this).attr('id').split('btnCancelRenewal-')[1];
                        $(`#planSelect_confirm_${id}`).toggleClass('reveal');
                    });
                });

            } else if (response.status === 400) {
                response.json().then(function (data) {
                }).catch((error) => { throw error });
            }
            else if (response.status === 500) {

            }
        }).catch((error) => {
        }).finally(() => {
        })
    }

    return {
        Init: init,
        LoadRenewalPlans: loadRenewalPlans,
    };

})(jQuery);



let ResetPassword = (function ($) {

    let AccessToken_ResetPassword;

    function assignEventHandlers() {
        $("#btnModalClose").click(() => $("#registrationModal").modal("hide"));
        $("#btnUserLogin").click(() => $("#registrationModal").modal("hide"));

        $('#btnSMSCancel').click(() => {
            window.location.reload();
        });

        $('#btnVerifySMSCancel').click(() => window.location.reload());
    }

    function initializeResetPasswordForm() {

        let forgotPasswordResponse = {};
        let smsResposne = {};
        let verifySMSResponse = {};

        $("form[id='forgotPasswordForm']").validate({
            rules: {
                Email: {
                    email: true,
                    required: true
                }
            },
            messages: {
                Email: {
                    email: "Please enter a valid Email",
                    required: "Please enter your Email"
                }
            },
            highlight: function (element) {
                $(element).addClass('is-invalid');
            },
            unhighlight: function (element) {
                $(element).removeClass('is-invalid')
            },
            errorPlacement: function (error, element) {
                $(element).next().append(error);
            },
            submitHandler: function (form) {
                $('#forgotPasswordError').hide();
                let request = {
                    'Email': $("input[name='Email']").val(),
                };
                request.ValidationType = $('input[name=optradio]:checked').val();
                $('#forgotPasswordBtnProcessing').show();
                $('#forgotPasswordBtn').hide();
                fetch('ForgotPassword', {
                    method: 'POST',
                    headers: {
                        'RequestVerificationToken': $('input:hidden[name="__RequestVerificationToken"]').val(),
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(request)
                }).then((response) => {
                    if (response.status === 200) {
                        response.json().then(function (data) {

                            forgotPasswordResponse.AccountNumber = data.AccountNumber;
                            forgotPasswordResponse.AccessToken = data.AccessToken;
                            forgotPasswordResponse.MaskedMobileNumber = data.MaskedMobileNumber;

                            if (request.ValidationType.toLowerCase() === 'email') {
                                $('#forgotpasswordInputPanel').hide();
                                $('#forgotPasswordSuccessPanel').show();
                            } else if (request.ValidationType.toLowerCase() === 'sms') {
                                $('#forgotpasswordInputPanel').hide();
                                $('#forgotPasswordSuccessPanel').hide();

                                $('#forgotPasswordSendSMSPanel').show();
                                $("#smsMobileNumberLabel").text(data.MaskedMobileNumber);
                            }
                        });
                    } else if (response.status === 404) {
                        response.json().then(function (data) {
                            $('#forgotPasswordError').show();
                            $('#forgotPasswordError').find("b").html(data.Message);
                        }).catch((error) => { throw error });;
                    }
                    else if (response.status === 500) {
                        $('#forgotPasswordError').show();
                        $('#forgotPasswordError').find("b").html("Error in verifying the email for resetting password!! Please try again!!");
                    }
                }).catch((error) => {
                    $('#forgotPasswordError').show();
                    $('#forgotPasswordError').find("b").html("Error in verifying the email for resetting the password!! Please try again!!");
                }).finally(() => {
                    $('#forgotPasswordBtnProcessing').hide();
                    $('#forgotPasswordBtn').show();
                })
            }
        });

        $("form[id='forgotPasswordSendSMSForm']").validate({
            rules: {
                'sendSMSCheck[]': {
                    required: true,
                    minlength: 1
                }
            },
            messages: {
                'sendSMSCheck[]': "Please select the checkbox to get the SMS."
            },
            highlight: function (element) {
                $(element).addClass('is-invalid');
            },
            unhighlight: function (element) {
                $(element).removeClass('is-invalid')
            },
            errorPlacement: function (error, element) {
                $(element).next().append(error);
            },
            submitHandler: function (form) {

                $('#sendSMSError').hide();
                let request = {
                    'AccessToken': forgotPasswordResponse.AccessToken
                };

                $('#sendSMSBtnProcessing').show();
                $('#sendSMSBtn').hide();

                fetch('SendSMS', {
                    method: 'POST',
                    headers: {
                        'RequestVerificationToken': $('input:hidden[name="__RequestVerificationToken"]').val(),
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(request)
                }).then((response) => {
                    if (response.status === 200) {
                        response.json().then(function (data) {
                            smsResposne.AccountNumber = data.AccountNumber;
                            smsResposne.AccessToken = data.AccessToken;
                            smsResposne.MaskedMobileNumber = data.MaskedMobileNumber;

                            $('#forgotPasswordVerifySMSPanel').show();
                            $('#forgotPasswordSendSMSPanel').hide()
                        });
                    } else if (response.status === 400) {
                        response.json().then(function (data) {
                            $('#sendSMSError').show();
                            $('#sendSMSError').find("b").html(data.Message);
                        }).catch((error) => { throw error });
                    }
                    else if (response.status === 500) {
                        $('#sendSMSError').show();
                        $('#sendSMSError').find("b").html("Error in sending the SMS!! Please try again!!");
                    }
                }).catch((error) => {
                    $('#sendSMSError').show();
                    $('#sendSMSError').find("b").html("Error in sending the SMS!! Please try again!!");
                }).finally(() => {
                    $('#sendSMSBtnProcessing').hide();
                    $('#sendSMSBtn').show();
                })
            }
        });

        $("form[id='forgotPasswordVerifySMSForm']").validate({
            rules: {
                SMSText: {
                    minlength: 3,
                    maxlength: 5,
                    required: true
                },
            },
            messages: {
                SMSText: {
                    minlength: "SMS code should be atleast 3 characters.",
                    required: "Please enter your SMS code."
                }
            },
            highlight: function (element) {
                $(element).addClass('is-invalid');
            },
            unhighlight: function (element) {
                $(element).removeClass('is-invalid')
            },
            errorPlacement: function (error, element) {
                $(element).next().append(error);
            },
            submitHandler: function (form) {

                $('#forgotPasswordVerifySMSError').hide();
                let request = {
                    'AccessToken': smsResposne.AccessToken,
                    'SMSCode': $("input[name='SMSText']").val()
                };

                $('#verifySMSBtnProcessing').show();
                $('#verifySMSBtn').hide();

                fetch('VerifySMSCode', {
                    method: 'POST',
                    headers: {
                        'RequestVerificationToken': $('input:hidden[name="__RequestVerificationToken"]').val(),
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(request)
                }).then((response) => {
                    if (response.status === 200) {
                        response.json().then(function (data) {

                            $('#forgotPasswordVerifySMSPanel').hide();
                            $('#resetPasswordPanel').show();

                            verifySMSResponse.AccountNumber = data.AccountNumber;
                            verifySMSResponse.AccessToken = data.AccessToken;
                            verifySMSResponse.MaskedMobileNumber = data.MaskedMobileNumber;
                        });
                    } else if (response.status === 400) {
                        response.json().then(function (data) {
                            $('#forgotPasswordVerifySMSError').show();
                            $('#forgotPasswordVerifySMSError').find("b").html(data.Message);
                        }).catch((error) => { throw error });
                    }
                    else if (response.status === 500) {
                        $('#forgotPasswordVerifySMSError').show();
                        $('#forgotPasswordVerifySMSError').find("b").html("Error in verifying the SMS Code!! Please try again!!");
                    }
                }).catch((error) => {
                    $('#forgotPasswordVerifySMSError').show();
                    $('#forgotPasswordVerifySMSError').find("b").html("Error in verifying the SMS Code!! Please try again!!");
                }).finally(() => {
                    $('#verifySMSBtnProcessing').hide();
                    $('#verifySMSBtn').show();
                })
            }
        });

        $("form[id='resetPasswordForm']").validate({
            rules: {
                UserPassword: {
                    minlength: 4,
                    maxlength: 8
                },
                ConfirmPassword: {
                    minlength: 4,
                    maxlength: 8,
                    equalTo: '[name="UserPassword"]'
                }
            },
            messages: {
                UserPassword: {
                    minlength: "Password should be a minimum of 4 characters"
                },
                ConfirmPassword: {
                    minlength: "Password should be a minimum of 4 characters",
                    equalTo: "Passwords should match"
                }
            },
            highlight: function (element) {
                $(element).addClass('is-invalid');
            },
            unhighlight: function (element) {
                $(element).removeClass('is-invalid')
            },
            errorPlacement: function (error, element) {
                $(element).next().append(error);
            },
            submitHandler: function (form) {

                let access_token;
                if (AccessToken_ResetPassword) {
                    access_token = AccessToken_ResetPassword;
                } else if (verifySMSResponse && verifySMSResponse.AccessToken) {
                    access_token = verifySMSResponse.AccessToken;
                }

                $('#resetPasswordError').hide();
                let request = {
                    'AccessToken': access_token,
                    'NewPassword': $("input[name='UserPassword']").val()
                };

                $('#resetPasswordBtnProcessing').show();
                $('#resetPasswordBtn').hide();

                fetch('ResetPassword', {
                    method: 'POST',
                    headers: {
                        'RequestVerificationToken': $('input:hidden[name="__RequestVerificationToken"]').val(),
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(request)
                }).then((response) => {
                    if (response.status === 200) {
                        response.json().then(function (data) {
                            $('#resetPasswordSuccessPanel').show();
                            $('#btnResetPasswordToolbar').hide();
                        });
                    } else if (response.status === 400) {
                        response.json().then(function (data) {
                            $('#resetPasswordError').show();
                            $('#resetPasswordError').find("b").html(data.Message);
                        }).catch((error) => { throw error });
                    }
                    else if (response.status === 500) {
                        $('#resetPasswordError').show();
                        $('#resetPasswordError').find("b").html("Error in resetting the Password!! Please try again!!");
                    }
                }).catch((error) => {
                    $('#resetPasswordError').show();
                    $('#resetPasswordError').find("b").html("Error in resetting the Password!! Please try again!!");
                }).finally(() => {
                    $('#resetPasswordBtnProcessing').hide();
                    $('#resetPasswordBtn').show();
                })
            }
        });
    }

    let init = function (accessToken_ResetPassword) {
        assignEventHandlers();
        initializeResetPasswordForm();
        AccessToken_ResetPassword = accessToken_ResetPassword;
        if (AccessToken_ResetPassword) {
            $('#forgotpasswordInputPanel').hide();
            $('#resetPasswordPanel').show();
        } else {
            $('#forgotpasswordInputPanel').show();
            $('#resetPasswordPanel').hide();
        }
    }

    return {
        Init: init
    };

})(jQuery);



let UsageSummary = (function ($) {

    let Urls;

    function resetUI() {
        $('#UsageSummaryLoading').show();
        $('#UsageSummaryPanel').hide();
    }

    function processApiData(data) {

        const months = {};
        for (const index in data) {
            if (data[index]) {
                if (!months[data[index].EndDate]) {
                    months[data[index].EndDate] = {
                        usage: 0,
                        date: moment(new Date(data[index].EndDate).toISOString(), moment.ISO_8601).toDate()
                    };
                }
                months[data[index].EndDate].usage += parseInt(data[index].KWH);
            }
        }
        return _.sortBy(_.values(months));
    }

    function loadUsageSummary(account) {

        resetUI();

        setTimeout(() => {

            try {

                let Access_Token = account.SelectedAccount.split('*')[1];
                let Url = Urls.getUsageHistory;
                fetch(Url, {
                    method: 'GET',
                    headers: {
                        "Content-Type": "application/json",
                        "Access_Token": Access_Token,
                        "Is_Ajax_Request": true
                    },
                }).then((response) => {
                    if (response.status === 200) {
                        response.json().then(function (data) {

                            if (data) {

                                let usageSummary =
                                    [{ "Service_Account_Id": 2435116, "Usage_Month": "2017-09-01T00:00:00", "Usage_Start_Date": "2017-09-23T00:00:00", "Usage_End_Date": "2017-09-27T00:00:00", "Usage_Type": "Actual", "Usage": 34, "Usage_Uom": "kWh" }, { "Service_Account_Id": 2435116, "Usage_Month": "2017-10-01T00:00:00", "Usage_Start_Date": "2017-09-27T00:00:00", "Usage_End_Date": "2017-10-26T00:00:00", "Usage_Type": "Actual", "Usage": 291, "Usage_Uom": "kWh" }, { "Service_Account_Id": 2435116, "Usage_Month": "2017-11-01T00:00:00", "Usage_Start_Date": "2017-10-26T00:00:00", "Usage_End_Date": "2017-11-28T00:00:00", "Usage_Type": "Actual", "Usage": 265, "Usage_Uom": "kWh" }, { "Service_Account_Id": 2435116, "Usage_Month": "2017-12-01T00:00:00", "Usage_Start_Date": "2017-11-28T00:00:00", "Usage_End_Date": "2017-12-29T00:00:00", "Usage_Type": "Actual", "Usage": 256, "Usage_Uom": "kWh" }, { "Service_Account_Id": 2435116, "Usage_Month": "2018-01-01T00:00:00", "Usage_Start_Date": "2017-12-29T00:00:00", "Usage_End_Date": "2018-01-30T00:00:00", "Usage_Type": "Actual", "Usage": 274, "Usage_Uom": "kWh" }, { "Service_Account_Id": 2435116, "Usage_Month": "2018-02-01T00:00:00", "Usage_Start_Date": "2018-01-30T00:00:00", "Usage_End_Date": "2018-02-28T00:00:00", "Usage_Type": "Actual", "Usage": 181, "Usage_Uom": "kWh" }, { "Service_Account_Id": 2435116, "Usage_Month": "2018-03-01T00:00:00", "Usage_Start_Date": "2018-02-28T00:00:00", "Usage_End_Date": "2018-03-29T00:00:00", "Usage_Type": "Actual", "Usage": 164, "Usage_Uom": "kWh" }, { "Service_Account_Id": 2435116, "Usage_Month": "2018-04-01T00:00:00", "Usage_Start_Date": "2018-03-29T00:00:00", "Usage_End_Date": "2018-04-30T00:00:00", "Usage_Type": "Actual", "Usage": 206, "Usage_Uom": "kWh" }, { "Service_Account_Id": 2435116, "Usage_Month": "2018-05-01T00:00:00", "Usage_Start_Date": "2018-04-30T00:00:00", "Usage_End_Date": "2018-05-30T00:00:00", "Usage_Type": "Actual", "Usage": 255, "Usage_Uom": "kWh" }, { "Service_Account_Id": 2435116, "Usage_Month": "2018-06-01T00:00:00", "Usage_Start_Date": "2018-05-30T00:00:00", "Usage_End_Date": "2018-06-28T00:00:00", "Usage_Type": "Actual", "Usage": 408, "Usage_Uom": "kWh" }, { "Service_Account_Id": 2435116, "Usage_Month": "2018-07-01T00:00:00", "Usage_Start_Date": "2018-06-28T00:00:00", "Usage_End_Date": "2018-07-30T00:00:00", "Usage_Type": "Actual", "Usage": 480, "Usage_Uom": "kWh" }, { "Service_Account_Id": 2435116, "Usage_Month": "2018-08-01T00:00:00", "Usage_Start_Date": "2018-07-30T00:00:00", "Usage_End_Date": "2018-08-28T00:00:00", "Usage_Type": "Actual", "Usage": 747, "Usage_Uom": "kWh" }, { "Service_Account_Id": 2435116, "Usage_Month": "2018-09-01T00:00:00", "Usage_Start_Date": "2018-08-28T00:00:00", "Usage_End_Date": "2018-09-27T00:00:00", "Usage_Type": "Actual", "Usage": 760, "Usage_Uom": "kWh" }, { "Service_Account_Id": 2435116, "Usage_Month": "2018-10-01T00:00:00", "Usage_Start_Date": "2018-09-27T00:00:00", "Usage_End_Date": "2018-10-26T00:00:00", "Usage_Type": "Actual", "Usage": 538, "Usage_Uom": "kWh" }, { "Service_Account_Id": 2435116, "Usage_Month": "2018-11-01T00:00:00", "Usage_Start_Date": "2018-10-26T00:00:00", "Usage_End_Date": "2018-11-28T00:00:00", "Usage_Type": "Actual", "Usage": 394, "Usage_Uom": "kWh" }, { "Service_Account_Id": 2435116, "Usage_Month": "2018-12-01T00:00:00", "Usage_Start_Date": "2018-11-28T00:00:00", "Usage_End_Date": "2018-12-31T00:00:00", "Usage_Type": "Actual", "Usage": 284, "Usage_Uom": "kWh" }, { "Service_Account_Id": 2435116, "Usage_Month": "2019-01-01T00:00:00", "Usage_Start_Date": "2018-12-31T00:00:00", "Usage_End_Date": "2019-01-30T00:00:00", "Usage_Type": "Actual", "Usage": 194, "Usage_Uom": "kWh" }, { "Service_Account_Id": 2435116, "Usage_Month": "2019-02-01T00:00:00", "Usage_Start_Date": "2019-01-30T00:00:00", "Usage_End_Date": "2019-02-28T00:00:00", "Usage_Type": "Actual", "Usage": 252, "Usage_Uom": "kWh" }, { "Service_Account_Id": 2435116, "Usage_Month": "2019-03-01T00:00:00", "Usage_Start_Date": "2019-02-28T00:00:00", "Usage_End_Date": "2019-03-29T00:00:00", "Usage_Type": "Actual", "Usage": 185, "Usage_Uom": "kWh" }, { "Service_Account_Id": 2435116, "Usage_Month": "2019-04-01T00:00:00", "Usage_Start_Date": "2019-03-29T00:00:00", "Usage_End_Date": "2019-04-30T00:00:00", "Usage_Type": "Actual", "Usage": 246, "Usage_Uom": "kWh" }, { "Service_Account_Id": 2435116, "Usage_Month": "2019-05-01T00:00:00", "Usage_Start_Date": "2019-04-30T00:00:00", "Usage_End_Date": "2019-05-30T00:00:00", "Usage_Type": "Actual", "Usage": 309, "Usage_Uom": "kWh" }, { "Service_Account_Id": 2435116, "Usage_Month": "2019-06-01T00:00:00", "Usage_Start_Date": "2019-05-30T00:00:00", "Usage_End_Date": "2019-06-28T00:00:00", "Usage_Type": "Actual", "Usage": 352, "Usage_Uom": "kWh" }, { "Service_Account_Id": 2435116, "Usage_Month": "2019-07-01T00:00:00", "Usage_Start_Date": "2019-06-28T00:00:00", "Usage_End_Date": "2019-07-30T00:00:00", "Usage_Type": "Actual", "Usage": 426, "Usage_Uom": "kWh" }, { "Service_Account_Id": 2435116, "Usage_Month": "2019-08-01T00:00:00", "Usage_Start_Date": "2019-07-30T00:00:00", "Usage_End_Date": "2019-08-23T00:00:00", "Usage_Type": "Actual", "Usage": 322, "Usage_Uom": "kWh" }]

                                usageSummary = data;

                                let usageHistory = processApiData(usageSummary);
                                usageHistory.sort((a, b) => a.date - b.date);

                                const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
                                    'September', 'October', 'November', 'December'];

                                const months = _.takeRight(usageHistory, 3);

                                let barChartData = [];
                                barChartData.push({
                                    datasets: [{
                                        data: _.map(months, month => month.usage),
                                        backgroundColor: ['rgb(27,141,205)'],
                                        borderColor: ['rgb(27,141,205)'],
                                        borderWidth: 10,
                                        label: 'Energy Consumption'
                                    }],
                                    labels: _.map(months, month => monthNames[month.date.getMonth()]),
                                });

                                let dataset = {
                                    datasets: [{
                                        data: _.map(months, month => month.usage),
                                        backgroundColor: 'rgb(27,141,205)',
                                        borderColor: 'rgb(27,141,205)',
                                        borderWidth: 10,
                                        label: 'Energy Consumption'
                                    }],
                                    labels: _.map(months, month => monthNames[month.date.getMonth()]),
                                };

                                var ctx = $('#UsageSummaryCanvas')[0].getContext('2d');
                                let usageSummaryBarChart = new Chart(ctx, {
                                    type: 'bar',
                                    data: dataset,
                                    options: {
                                        scaleShowVerticalLines: false,
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        legend: {
                                            position: 'top',
                                        },
                                        tooltips: {
                                            callbacks: {
                                                label: (tooltipItem) => {
                                                    return tooltipItem.yLabel + 'kwh';
                                                }
                                            }
                                        },
                                        scales: {
                                            yAxes: [{ id: 'y-axis-1', type: 'linear', position: 'left', ticks: { min: 0, stepSize: 100 } }]
                                        }
                                    },
                                });
                            }

                        });
                    } else if (response.status === 400) {
                        response.json().then(function (data) {
                        }).catch((error) => { throw error });
                    } else if (response.status === 401) {
                        UnAuthorizedHandler.Handle401();
                    }
                    else if (response.status === 500) {
                    }
                }).catch((error) => {

                }).finally(() => {
                    $('#UsageSummaryLoading').hide();
                    $('#UsageSummaryPanel').show();
                })
            }
            catch (err) {
            }

        }, 0)
    }

    let init = function (urls) {
        Urls = urls;
    }

    return {
        Init: init,
        LoadUsageSummary: loadUsageSummary,
    };

})(jQuery);

let ViewMyBill = (function ($) {

    let Urls;
    let AccessToken;
    let Url;
    let SelectedAccount;

    function resetUI() {

    }

    function loadViewMyBill(accountDetail) {

        resetUI();

        AccessToken = accountDetail.SelectedAccount.split('*')[1];
        SelectedAccount = accountDetail.SelectedAccountDetails;

        $('#viewMyBillLoadingPanel').hide();
        $('#viewMyBillPanel').show();
        $('#AccountNumberDisplay').html(accountDetail.SelectedAccount.split('*')[0].split('-')[0]);

        let totalDue = parseFloat(SelectedAccount.TotalDue);

        if ((SelectedAccount.IsPastDue || (SelectedAccount.TotalDue && totalDue > 0))
            && SelectedAccount.HasAtleastOnePayment) {

            $('#DueDate').show();
            $('#DueDate').text(`Due Date: ${SelectedAccount.LatestInvoiceDueDate}`);

            $('#DueDateResponsive').show();
            $('#DueDateResponsive').text(`Due Date: ${SelectedAccount.LatestInvoiceDueDate}`);
        }

        if (!SelectedAccount.IsPastDue
            && SelectedAccount.HasAtleastOnePayment
            && totalDue <= 0) {
            $('#LatestPaymentPanel').show();
            $('#LatestBillAmount').text(SelectedAccount.LastPaymentAmountDisplayValue);
            $('#LatestBillPaymentDate').text(SelectedAccount.LastPaymentDateDisplayValue);

            $('#LatestPaymentPanelResponsive').show();
            $('#LatestBillAmountResponsive').text(SelectedAccount.LastPaymentAmountDisplayValue);
            $('#LatestBillPaymentDateResponsive').text(SelectedAccount.LastPaymentDateDisplayValue);
        }

        $('#TotalDueLabel').text(SelectedAccount.TotalDueDisplayValue);
        $('#CurrentDueLabel').text(SelectedAccount.CurrentBalaceDisplayValue);
        $('#PastDueLabel').text(SelectedAccount.PastDueDisplayValue);

        if (SelectedAccount.MyBillDisplayView) {
            switch (SelectedAccount.MyBillDisplayView) {
                case "PastDuePayNow":
                    $('#PastDuePayNowPanel').show();
                    break;
                case "AutoPay":
                    {
                        $('#AutoPayPanel').show();
                        if (SelectedAccount.ScheduledAutoBillPaymentDateDisplayValue) {
                            $('#AutoPayLabel').text(`Auto Pay is scheduled for </br> ${selectedAccount.ScheduledAutoBillPaymentDateDisplayValue}`);
                        }
                        else {
                            $('#AutoPayLabel').text('Auto Pay is scheduled for your next payment date');
                        }
                    }
                    break;
                case "MakePayment":
                    {
                        $('#MakePaymentPanel').show();
                    }
                    break;
                default:
                    $('#MakePaymentPanel').show();
            }
        }

    }

    let init = function (urls) {
        Urls = urls;
    }

    return {
        Init: init,
        LoadViewMyBill: loadViewMyBill,
    };

})(jQuery);