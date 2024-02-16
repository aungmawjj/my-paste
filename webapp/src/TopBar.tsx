import axios from "axios";
import { useCallback } from "react";
import { User } from "./model";
import {
  Avatar,
  Text,
  Flex,
  Spacer,
  Icon,
  Image,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Button,
  PopoverArrow,
  PopoverCloseButton,
  PopoverHeader,
  PopoverBody,
  Box,
  BoxProps,
  Hide,
} from "@chakra-ui/react";
import { MdAdd, MdLogout } from "react-icons/md";
import { useLocation, useNavigate } from "react-router-dom";

type Props = {
  user: User;
  height?: BoxProps["height"];
  px?: BoxProps["px"];
};

function TopBar({ user, height, px }: Readonly<Props>) {
  const handleLogout = useCallback(() => {
    axios
      .post("/api/auth/logout", null)
      .then(() => {
        window.location.replace("/login");
      })
      .catch(console.error);
  }, []);

  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Box
      data-testid="top-bar"
      px={px}
      height={height}
      width="100%"
      position="fixed"
      top={0}
      zIndex={1}
      bg="white"
      boxShadow="sm"
    >
      <Flex height="100%" alignItems="center" gap={6}>
        <Image src="/LogoMyPaste.svg" />
        <Spacer />
        {!location.pathname.includes("add-paste") && (
          <Hide below="md">
            <Button
              colorScheme="brand"
              leftIcon={<Icon as={MdAdd} boxSize={6} />}
              onClick={() => navigate("/add-paste")}
            >
              Add
            </Button>
          </Hide>
        )}
        <Popover autoFocus={false}>
          <PopoverTrigger>
            <Avatar as={Button} size="md" name={user.Name} />
          </PopoverTrigger>
          <PopoverContent mx={2}>
            <PopoverArrow />
            <PopoverCloseButton />
            <PopoverHeader textAlign="center">{user.Name}</PopoverHeader>
            <PopoverBody textAlign="center">
              <Text fontSize="sm" mt={4} mb={6}>
                {user.Email}
              </Text>
              <Button
                leftIcon={<Icon as={MdLogout} boxSize={6} />}
                onClick={handleLogout}
              >
                Logout
              </Button>
            </PopoverBody>
          </PopoverContent>
        </Popover>
      </Flex>
    </Box>
  );
}

export default TopBar;
