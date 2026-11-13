Each **client** lives at one address but can submit flooring requests for multiple addresses. One flooring request must be associated with one client. There is no creditCard table for simplification and assuming that no two clients use the same credit card information.



**Photos** are not going to be stored in the database but locally in order to reduce pressure on the server. One way to gracefully handle this is to have "caches", one on the contractor's and the original file on the client side. This way, in a live online environment, the client would not have to repeatedly upload content. This will be explored to see if feasible.



As for **Patterns**, we assume that flooring products are holistically compatible with all pattern options that is offered. Otherwise, a PatternsMapping table would need to be created in which we associate a product with a pattern, and use this table to offer the options to the user.



This somewhat extends to **Materials**, we assume that each flooring product has its own associated material (no option given to the user to change material for a specific product and no materials table is maintained). Otherwise, a ProductMaterialMapping table would need to be created in which we associate a product with a material, and use this table to offer the options to the user. Of course, this would mean that we need a separate material table which would have the name, description, unit price, and pricingUnit attributes.



As for the **Address** table, we assume that all addresses served would be in the United States, omitting the country attribute. Otherwise, we would have a country attribute of CHAR(3), intending to use ISO-3 characters for address.



As for **Flooring Requests**, we assume that each **room** has at maximum one flooring product associated with it. Otherwise, we would have a ProjectAreaProducts table in which there would be a primary key for the projectAreaProductID, and two foreign keys for flooringProjectArea and flooringProductID respectively (which would no longer exist in the Room table anymore), with an allocatedSquareFootage attribute for that specific product in that area (which would need to have a constraint that the combination of the square footage of all products in the area must not be greater than the total square footage of the flooring project area).

