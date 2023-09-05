import {images} from "../../images"

export const MenuConfig = [
    {
        category: "Tacos",
        items: [
            {
                name: "Soft Taco",
                ingredients: 'Protien, Lettuce, Cheese',
                description: "Snack sized wrap filled with protien, lettuce and cheese",
                imageUrl: images.SoftTaco,
                extras: [
                    {
                        type: 'Sour Cream',
                        price: 0.50
                    },
                    {
                        type: 'Crispy Onions',
                        price: 0.50
                    }
                ],
                protien: [
                    {
                        type: 'chicken'
                    },
                    {
                        type: 'beef'
                    },
                    {
                        type: 'spicy bean'
                    },
                ],
                price: 6.99,
            },
            {
                name: "Crunchy Taco",
                ingredients: 'Protien, Lettuce, Cheese',
                description: "Snack sized wrap filled with protien, lettuce and cheese",
                imageUrl: images.CrunchyTacoBeef,
                extras: [
                    {
                        type: 'Sour Cream',
                        price: 0.50
                    },
                    {
                        type: 'Crispy Onions',
                        price: 0.50
                    }
                ],
                protien: [
                    {
                        type: 'chicken'
                    },
                    {
                        type: 'beef'
                    },
                    {
                        type: 'spicy bean'
                    },
                ],
                price: 6.99,
            },
            {
                name: "Crunchy Taco Monster",
                ingredients: 'Protien, Lettuce, Cheese',
                description: "Extra large taco with protien, lettuce and cheese",
                imageUrl: images.CrunchyTacoBeef,
                extras: [
                    {
                        type: 'Sour Cream',
                        price: 0.50
                    },
                    {
                        type: 'Crispy Onions',
                        price: 0.50
                    }
                ],
                protien: [
                    {
                        type: 'chicken'
                    },
                    {
                        type: 'beef'
                    },
                    {
                        type: 'spicy bean'
                    },
                ],
                price: 7.99,
            },
            {
                name: "Soft Taco Monster",
                ingredients: 'Protien, Lettuce, Cheese',
                description: "Extra large soft taco with protien, lettuce and cheese",
                imageUrl: images.SoftTaco,
                extras: [
                    {
                        type: 'Sour Cream',
                        price: 0.50
                    },
                    {
                        type: 'Crispy Onions',
                        price: 0.50
                    }
                ],
                protien: [
                    {
                        type: 'chicken'
                    },
                    {
                        type: 'beef'
                    },
                    {
                        type: 'spicy bean'
                    },
                ],
                price: 7.99,
            }
        ],
    },
    {
        category: "Burritos",
        items: [
            {
                name: "Burrito",
                ingredients: 'Protien, Lettuce, Cheese',
                description: "Full sized wrap filled with protien, lettuce and cheese",
                imageUrl: images.Burrito,
                extras: [
                    {
                        type: 'Sour Cream',
                        price: 0.50
                    },
                    {
                        type: 'Crispy Onions',
                        price: 0.50
                    }
                ],
                protien: [
                    {
                        type: 'chicken'
                    },
                    {
                        type: 'beef'
                    },
                    {
                        type: 'spicy bean'
                    },
                ],
                price: 6.99,
            },
            {
                name: "Burrito Monster",
                ingredients: 'Protien, Lettuce, Cheese',
                description: "Extra large burrito filled with protien, lettuce and cheese",
                imageUrl: images.Burrito,
                extras: [
                    {
                        type: 'Sour Cream',
                        price: 0.50
                    },
                    {
                        type: 'Crispy Onions',
                        price: 0.50
                    }
                ],
                protien: [
                    {
                        type: 'chicken'
                    },
                    {
                        type: 'beef'
                    },
                    {
                        type: 'spicy bean'
                    },
                ],
                price: 7.99,
            },
            {
                name: "Create your own burrito",
                ingredients: 'Choose your own ingredients',
                description: "Customize your burrito with your favorite ingredients",
                imageUrl: images.Burrito,
                extras: [
                    {
                        type: 'Sour Cream',
                        price: 0.50
                    },
                    {
                        type: 'Crispy Onions',
                        price: 0.50
                    }
                ],
                price: 8.99,
            }
        ],
    },
    {
        category: "Fries",
        items: [
            {
                name: "Monster Fries",
                ingredients: 'Protien, Lettuce, Cheese',
                description: "Fries with protien, lettuce and cheese",
                imageUrl: images.MonsterFries,
                extras: [
                    {
                        type: 'Sour Cream',
                        price: 0.50
                    },
                    {
                        type: 'Crispy Onions',
                        price: 0.50
                    }
                ],
                protien: [
                    {
                        type: 'chicken'
                    },
                    {
                        type: 'beef'
                    },
                    {
                        type: 'spicy bean'
                    },
                ],
                price: 6.99,
            },
            {
                name: "Cheesy Fries",
                ingredients: 'Fries Cheese',
                description: "Fries with cheese",
                imageUrl: images.CheesyFries,
                extras: [
                    {
                        type: 'Sour Cream',
                        price: 0.50
                    },
                    {
                        type: 'Crispy Onions',
                        price: 0.50
                    }
                ],
                price: 6.99,
            },
            {
                name: "Seasoned Fries",
                ingredients: 'Seasoned Fries',
                description: "Fries with special seasoning",
                imageUrl: images.SeasonedFries,
                extras: [
                    {
                        type: 'Sour Cream',
                        price: 0.50
                    },
                    {
                        type: 'Crispy Onions',
                        price: 0.50
                    }
                ],
                price: 5.99,
            },
            // {
            //     name: "Nacho Monster",
            //     ingredients: 'Nacho Chips, Protien, Lettuce, Cheese',
            //     description: "Nacho chips with protien, lettuce and cheese",
            //     imageUrl: "11062b_4074ac690fe04eef94fa7abfff3e0a51~mv2.jpg",
            //     extras: [
            //         {
            //             type: 'Sour Cream',
            //             price: 0.50
            //         },
            //         {
            //             type: 'Crispy Onions',
            //             price: 0.50
            //         }
            //     ],
            //     protien: [
            //         {
            //             type: 'chicken'
            //         },
            //         {
            //             type: 'beef'
            //         },
            //         {
            //             type: 'spicy bean'
            //         },
            //     ],
            //     price: 7.99,
            // },
            // {
            //     name: "Cheesy Nachos",
            //     ingredients: 'Nacho Chips, Cheese',
            //     description: "Nacho chips with cheese",
            //     imageUrl: "11062b_d57e81fe12054313a65ea779e858aa55~mv2_d_4608_3072_s_4_2.jpg",
            //     extras: [
            //         {
            //             type: 'Sour Cream',
            //             price: 0.50
            //         },
            //         {
            //             type: 'Crispy Onions',
            //             price: 0.50
            //         }
            //     ],
            //     price: 6.99,
            // }
        ],
    },
    {
        category: "Grillers",
        items: [
            {
                name: "Chicken Drizzle Griller",
                ingredients: 'Chicken, Cheese, Drizzle Sauce',
                description: "Grilled chicken with cheese and special drizzle sauce",
                imageUrl: images.ChickenDrizzler,
                extras: [
                    {
                        type: 'Sour Cream',
                        price: 0.50
                    },
                    {
                        type: 'Crispy Onions',
                        price: 0.50
                    }
                ],
                price: 7.99,
            },
            {
                name: "Beany Cheese Griller",
                ingredients: 'Beans, Cheese',
                description: "Grilled beans with cheese",
                imageUrl: images.BeanyCheese,
                extras: [
                    {
                        type: 'Sour Cream',
                        price: 0.50
                    },
                    {
                        type: 'Crispy Onions',
                        price: 0.50
                    }
                ],
                price: 6.99,
            },
            {
                name: "Beefy Cheese Griller",
                ingredients: 'Beef, Cheese',
                description: "Grilled beef with cheese",
                imageUrl: images.BeefyCheese,
                extras: [
                    {
                        type: 'Sour Cream',
                        price: 0.50
                    },
                    {
                        type: 'Crispy Onions',
                        price: 0.50
                    }
                ],
                price: 7.99,
            }
        ],
    },
    {
        category: "Drinks",
        items: [
            {
                name: "Fanta",
                ingredients: 'Fanta',
                description: "Refreshing Fanta drink",
                imageUrl: images.FantaFruitTwist,
                price: 2.99,
            },
            {
                name: "Pepsi Max Cherry",
                ingredients: 'Pepsi Max Cherry',
                description: "Refreshing Cherry drink",
                imageUrl: images.PepsiMaxCherry,
                price: 2.99,
            },
            {
                name: "Pepsi Max",
                ingredients: 'Pepsi Max',
                description: "Refreshing Pepsi drink",
                imageUrl: images.PepsiMax,
                price: 2.99,
            }
        ],
    },
    {
        category: "Desserts",
        items: [
            {
                name: "Churros with Dulce de Leche",
                ingredients: 'Churros, Dulce de Leche',
                description: "Delicious churros with Dulce de Leche",
                imageUrl: images.TwoChurrosDulce,
                price: 4.99,
            },
            {
                name: "Churros",
                ingredients: 'Churros',
                description: "Delicious churros",
                imageUrl: images.TwoChurros,
                price: 3.99,
            }
        ],
    }
]
